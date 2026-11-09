-- Private in-app chat between a customer and their salesperson.
--
-- Why this exists (Terry, 2026-11-09): the customer should stay inside
-- the app until they pick up their car, but wa.me links always switch
-- them out to WhatsApp, and WhatsApp can't be embedded in another app.
-- Keeping salespeople inside Trengo isn't an option either — UCG's
-- salesperson/customer conversations are private, not something every
-- other salesperson in the shared inbox should see. That's why staff
-- switch to their personal WhatsApp today.
--
-- This mirrors that same real-world flow inside the app:
--   1. A customer's chat starts UNCLAIMED — visible to every staff member
--      (the "Waiting for a salesperson" list), same as a new message in
--      the shared Trengo inbox.
--   2. One salesperson claims it (claim_chat_thread). From that moment
--      ONLY that salesperson and that customer can read or write it — the
--      in-app equivalent of moving to their personal WhatsApp.
--
-- Privacy is enforced here, by RLS, not by what the app's screens happen
-- to show — another salesperson's login can't load a claimed chat even by
-- querying the API directly with the public anon key.
--
-- Deliberately NOT included yet: manager visibility. Salesperson-only is
-- the stricter default; if David decides managers should be able to see
-- chats (e.g. to cover a salesperson who's out or has left), that's one
-- more `or public.is_chat_manager()` clause in chat_can_access_thread()
-- below, using the already-present staff_members.is_manager column.

-- ---------------------------------------------------------------------
-- Staff accounts
-- ---------------------------------------------------------------------

-- Which auth accounts are UCG staff. There is intentionally NO insert/
-- update policy for the app: nobody can make themselves staff from the
-- client. Rows are added by an admin in the Supabase dashboard's SQL
-- editor, e.g.:
--
--   insert into public.staff_members (user_id, display_name, location)
--   select id, 'John Smith', 'Ramstein' from auth.users
--   where email = 'john.smith@usedcarguys.net';
--
-- (The salesperson creates a normal account in the app first, then gets
-- marked as staff — same account, no separate login system.)
create table if not exists public.staff_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  location text,
  is_manager boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;

-- A staff member can read their own row (the app uses it to decide
-- whether to show the Staff Inbox). No one can read anyone else's.
create policy "Staff read own row" on public.staff_members
  for select to authenticated
  using (user_id = auth.uid());

-- SECURITY DEFINER so RLS policies on other tables can ask "is the
-- current user active staff?" without the caller needing read access to
-- staff_members itself. search_path pinned per Supabase's guidance for
-- definer functions.
create or replace function public.is_chat_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_members
    where user_id = auth.uid() and active
  );
$$;

-- ---------------------------------------------------------------------
-- Threads — one per customer
-- ---------------------------------------------------------------------

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  -- Captured at creation from what the app already knows, so a
  -- salesperson's inbox has something to recognise the customer by.
  customer_name text,
  car_label text,
  salesperson_id uuid references auth.users (id) on delete set null,
  salesperson_name text,
  claimed_at timestamptz,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  created_at timestamptz not null default now()
);

create index if not exists chat_threads_salesperson_idx on public.chat_threads (salesperson_id, last_message_at desc);
create index if not exists chat_threads_unclaimed_idx on public.chat_threads (last_message_at desc) where salesperson_id is null;

alter table public.chat_threads enable row level security;

-- The single source of truth for "who may see this thread" — used by
-- both tables' policies so they can't drift apart.
create or replace function public.chat_can_access_thread(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_threads t
    where t.id = p_thread_id
      and (
        t.customer_id = auth.uid()
        or t.salesperson_id = auth.uid()
        -- Unclaimed = the shared waiting list, open to all active staff.
        or (t.salesperson_id is null and public.is_chat_staff())
      )
  );
$$;

create policy "Thread participants and waiting-list staff can read" on public.chat_threads
  for select to authenticated
  using (public.chat_can_access_thread(id));

-- A customer starts their own thread, unclaimed. Claiming and the
-- last-message fields are only ever changed by the definer functions
-- below — there is no client UPDATE policy at all, so a customer can't
-- assign themselves a salesperson and a salesperson can't steal a claimed
-- thread.
create policy "Customers create their own unclaimed thread" on public.chat_threads
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and salesperson_id is null
    and salesperson_name is null
    and claimed_at is null
  );

-- ---------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'staff')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread_idx on public.chat_messages (thread_id, created_at);

alter table public.chat_messages enable row level security;

create policy "Thread participants and waiting-list staff can read messages" on public.chat_messages
  for select to authenticated
  using (public.chat_can_access_thread(thread_id));

-- Customers write to their own thread; staff only to a thread they've
-- claimed (a salesperson has to take the customer before replying, so a
-- reply can never come from someone who then loses access).
create policy "Participants send as themselves" on public.chat_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (sender_role = 'customer' and exists (
        select 1 from public.chat_threads t where t.id = thread_id and t.customer_id = auth.uid()
      ))
      or (sender_role = 'staff' and exists (
        select 1 from public.chat_threads t where t.id = thread_id and t.salesperson_id = auth.uid()
      ))
    )
  );

-- Keeps the inbox's sort order and preview line current without giving
-- clients UPDATE rights on threads.
create or replace function public.chat_touch_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_threads
  set last_message_at = new.created_at,
      last_message_preview = left(new.body, 140)
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists chat_messages_touch_thread on public.chat_messages;
create trigger chat_messages_touch_thread
  after insert on public.chat_messages
  for each row execute function public.chat_touch_thread();

-- ---------------------------------------------------------------------
-- Claiming — "take this customer"
-- ---------------------------------------------------------------------

-- Atomic: the `salesperson_id is null` condition in the UPDATE means two
-- salespeople tapping "Take" at the same moment can't both win — the
-- second one gets the 'already_claimed' error instead.
create or replace function public.claim_chat_thread(p_thread_id uuid)
returns public.chat_threads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_thread public.chat_threads;
begin
  select display_name into v_name
  from public.staff_members
  where user_id = auth.uid() and active;

  if v_name is null then
    raise exception 'not_staff';
  end if;

  update public.chat_threads
  set salesperson_id = auth.uid(),
      salesperson_name = v_name,
      claimed_at = now()
  where id = p_thread_id and salesperson_id is null
  returning * into v_thread;

  if v_thread.id is null then
    raise exception 'already_claimed';
  end if;

  return v_thread;
end;
$$;

revoke all on function public.claim_chat_thread(uuid) from public, anon;
grant execute on function public.claim_chat_thread(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Realtime — messages appear live on both phones
-- ---------------------------------------------------------------------

-- Supabase Realtime's postgres_changes respects the RLS policies above,
-- so a subscriber only receives rows they're allowed to SELECT.
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_threads;
