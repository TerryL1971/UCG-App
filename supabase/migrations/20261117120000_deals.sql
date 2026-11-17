-- Deals, status marks and deal documents for the companion app.
--
-- Why this exists (Terry, David and Michelle, Nov 2026): the website
-- inventory feed and any DealerTeam API are off the table, so the app
-- becomes a companion that starts AFTER the salesperson has taken the
-- deposit and marked the deal Won – Accepted in DealerTeam. DealerTeam
-- stays the official record; nothing here syncs with it. A salesperson
-- types the handful of fields the app needs off the Purchase Order /
-- Cost Estimate / Bill of Sale (until the app can read those PDFs by
-- itself), taps the status marks only they can know about (Retail
-- Ready, Paid in Full, Delivered…), and uploads scans. The customer
-- connects to their deal with the Deal # and their last name — both are
-- printed on their paperwork — and from then on sees it live.
--
-- Two kinds of deal, never combined (UCG has no US-style trade-in; a
-- trade-in is always its own deal):
--   purchase — the customer buys from UCG (AE Form 550-175A). DEN cars
--              (never on the USAREUR system) use a Cost Estimate + VAT
--              forms instead, and must NEVER show a deposit/reservation.
--   sale     — UCG buys from the customer (Bill of Sale, AE 550-175B).
--
-- Apply by pasting this whole file into the Supabase dashboard's SQL
-- Editor (same as the private_chat migration), then — once the CLI can
-- connect — `supabase migration repair --status applied 20261117120000`.
--
-- Depends on public.staff_members and public.is_chat_staff() from
-- 20261109120000_private_chat.sql.

-- ---------------------------------------------------------------------
-- Deals
-- ---------------------------------------------------------------------

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('purchase', 'sale')),
  is_den boolean not null default false,
  deal_number text not null unique check (char_length(btrim(deal_number)) between 1 and 20),
  stock_number text not null check (char_length(btrim(stock_number)) between 1 and 20),
  customer_name text not null,
  -- What the customer types to connect. Compared ignoring case, spaces
  -- and punctuation (O'Connell = oconnell) — see link_my_deal().
  customer_last_name text not null,
  -- Null until the customer connects from their own account.
  customer_id uuid references auth.users (id) on delete set null,
  salesperson_id uuid default auth.uid() references auth.users (id) on delete set null,
  salesperson_name text,
  vehicle_year int check (vehicle_year between 1950 and 2100),
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  vin text not null check (char_length(btrim(vin)) between 11 and 17),
  odometer int check (odometer >= 0),
  -- Purchase: "Total Price (AE550/VAT Form)". DEN: the Cost Estimate's
  -- Total Price, never the MWST-inclusive Total Amount. Sale: "Total
  -- Vehicle Price (AE550)" on the Bill of Sale.
  total_price numeric(12, 2) not null check (total_price >= 0),
  -- The $300 the salesperson took. Always 0 on DEN and sale deals: a DEN
  -- deposit is not listed anywhere (VAT rules), and a sale has none.
  deposit numeric(12, 2) not null default 0 check (deposit >= 0),
  payment_method text check (payment_method in ('cash', 'finance')),
  lender text,
  -- Deal Date (Purchase Order), Date (Cost Estimate) or Purchase Date
  -- (Bill of Sale).
  document_date date not null,
  -- Purchase Order term 2: "paid in full within N calendar days".
  -- Printed as seven today; Terry believes it may be changing to five.
  pay_in_full_days int not null default 7 check (pay_in_full_days between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_den_is_purchase check (not is_den or kind = 'purchase'),
  constraint deals_no_deposit_on_den_or_sale check (deposit = 0 or (kind = 'purchase' and not is_den))
);

create index if not exists deals_customer_idx on public.deals (customer_id);
create index if not exists deals_salesperson_idx on public.deals (salesperson_id, created_at desc);

alter table public.deals enable row level security;

create or replace function public.can_access_deal(p_deal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.deals d
    where d.id = p_deal_id
      and (d.customer_id = auth.uid() or public.is_chat_staff())
  );
$$;

-- The customer sees their own deals; every active staff member sees all
-- deals (salespeople cover for each other, and the buying team needs a
-- car's documents at sell-back).
create policy "Customers read their deals, staff read all" on public.deals
  for select to authenticated
  using (customer_id = auth.uid() or public.is_chat_staff());

create policy "Staff create deals" on public.deals
  for insert to authenticated
  with check (public.is_chat_staff() and customer_id is null);

create policy "Staff update deals" on public.deals
  for update to authenticated
  using (public.is_chat_staff())
  with check (public.is_chat_staff());

-- Fill in the salesperson's display name and keep updated_at current.
create or replace function public.deals_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.salesperson_id is not null
     and (tg_op = 'INSERT' or new.salesperson_id is distinct from old.salesperson_id) then
    select display_name into new.salesperson_name
    from public.staff_members where user_id = new.salesperson_id;
  end if;
  new.deal_number := btrim(new.deal_number);
  new.stock_number := upper(btrim(new.stock_number));
  new.vin := upper(btrim(new.vin));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists deals_before_write on public.deals;
create trigger deals_before_write
  before insert or update on public.deals
  for each row execute function public.deals_before_write();

-- ---------------------------------------------------------------------
-- Status marks — things only the salesperson knows
-- ---------------------------------------------------------------------
--
--   retail_ready         purchase (non-DEN): car is Retail Ready in
--                        DealerTeam; the pay-in-full countdown starts.
--   paid_in_full         purchase: Michelle has ticked PIF in DealerTeam
--                        (DEN: the cashier's check is deposited / the
--                        loan has paid). Unlocks the 550-175A step.
--   customs_cleared      the 550s are cleared at the German Zollamt.
--   tuv_release          DEN: TÜV done and release number received.
--   registration_packet  the customer's registration packet is ready.
--   delivered            hand-over done; the 5-business-day inspection
--                        guarantee starts.
--   vehicle_received     sale: UCG has the car, keys and documents.
--   deregistered         sale: deregistered (happened_on = the date on
--                        the deregistration proof; UCG pays within 30
--                        days of it).
--   paid_out             sale: UCG has paid the customer / their lender.

create table if not exists public.deal_milestones (
  deal_id uuid not null references public.deals (id) on delete cascade,
  milestone text not null check (milestone in (
    'retail_ready', 'paid_in_full', 'customs_cleared', 'tuv_release', 'registration_packet',
    'delivered', 'vehicle_received', 'deregistered', 'paid_out'
  )),
  happened_on date not null default current_date,
  marked_at timestamptz not null default now(),
  marked_by uuid default auth.uid() references auth.users (id) on delete set null,
  marked_by_name text,
  primary key (deal_id, milestone)
);

alter table public.deal_milestones enable row level security;

create policy "Deal participants read status marks" on public.deal_milestones
  for select to authenticated
  using (public.can_access_deal(deal_id));

-- Only staff set or undo a mark, and only as themselves.
create policy "Staff set status marks" on public.deal_milestones
  for insert to authenticated
  with check (public.is_chat_staff() and marked_by = auth.uid());

create policy "Staff undo status marks" on public.deal_milestones
  for delete to authenticated
  using (public.is_chat_staff());

create or replace function public.deal_milestones_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select display_name into new.marked_by_name
  from public.staff_members where user_id = new.marked_by;
  return new;
end;
$$;

drop trigger if exists deal_milestones_before_insert on public.deal_milestones;
create trigger deal_milestones_before_insert
  before insert on public.deal_milestones
  for each row execute function public.deal_milestones_before_insert();

-- ---------------------------------------------------------------------
-- Deal documents — one row per uploaded PDF in the deal-files bucket
-- ---------------------------------------------------------------------

create table if not exists public.deal_files (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  doc_type text not null check (doc_type in (
    'purchase_order', 'cost_estimate', 'bill_of_sale', 'warranty_certificate', 'hand_over',
    'ae550a', 'ae550a_stamped', 'ae550b', 'ae550b_stamped',
    'vat_form', 'cashiers_check', 'loan_approval', 'tuv',
    'tt_doc', 'registration', 'title', 'lien_release', 'payoff_letter', 'registration_memo',
    'deregistration', 'license', 'other'
  )),
  storage_path text not null unique,
  page_count int not null default 1 check (page_count between 1 and 30),
  -- Nullable: if the uploader's account is deleted, the document stays
  -- with the deal (it's UCG's sale record) and just loses the link.
  uploaded_by uuid default auth.uid() references auth.users (id) on delete set null,
  uploaded_by_role text not null check (uploaded_by_role in ('customer', 'staff')),
  uploaded_by_name text,
  -- Set when a newer scan of the same document replaces this one (e.g. a
  -- corrected Purchase Order). Old versions are kept, never deleted.
  replaced_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists deal_files_deal_idx on public.deal_files (deal_id, created_at desc);

alter table public.deal_files enable row level security;

create policy "Deal participants read documents" on public.deal_files
  for select to authenticated
  using (public.can_access_deal(deal_id));

create policy "Participants add documents as themselves" on public.deal_files
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and replaced_at is null
    and (
      (uploaded_by_role = 'staff' and public.is_chat_staff())
      or (uploaded_by_role = 'customer' and exists (
        select 1 from public.deals d where d.id = deal_id and d.customer_id = auth.uid()
      ))
    )
  );

create or replace function public.deal_files_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.uploaded_by_role = 'staff' then
    select display_name into new.uploaded_by_name
    from public.staff_members where user_id = new.uploaded_by;
  else
    select customer_name into new.uploaded_by_name
    from public.deals where id = new.deal_id;
  end if;
  return new;
end;
$$;

drop trigger if exists deal_files_before_insert on public.deal_files;
create trigger deal_files_before_insert
  before insert on public.deal_files
  for each row execute function public.deal_files_before_insert();

-- A new scan of the same document supersedes the old one ('other' never
-- does — a deal can have any number of those).
create or replace function public.deal_files_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.doc_type <> 'other' then
    update public.deal_files
    set replaced_at = now()
    where deal_id = new.deal_id
      and doc_type = new.doc_type
      and id <> new.id
      and replaced_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists deal_files_after_insert on public.deal_files;
create trigger deal_files_after_insert
  after insert on public.deal_files
  for each row execute function public.deal_files_after_insert();

-- ---------------------------------------------------------------------
-- Storage: private bucket, one folder per deal  (<deal id>/<file>.pdf)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('deal-files', 'deal-files', false, 26214400, array['application/pdf'])
on conflict (id) do nothing;

-- Compares as text so a malformed folder name is simply "no access"
-- rather than a uuid cast error.
create or replace function public.can_access_deal_folder(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.deals d
    where d.id::text = (storage.foldername(p_object_name))[1]
      and (d.customer_id = auth.uid() or public.is_chat_staff())
  );
$$;

create policy "Deal files: read a deal you can see" on storage.objects
  for select to authenticated
  using (bucket_id = 'deal-files' and public.can_access_deal_folder(name));

create policy "Deal files: upload to a deal you can see" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'deal-files' and public.can_access_deal_folder(name));

-- ---------------------------------------------------------------------
-- Connecting a customer to their deal — Deal # + last name
-- ---------------------------------------------------------------------

-- Failed attempts, for a simple per-account limit against guessing.
-- Written only by link_my_deal(); no client access at all.
create table if not exists public.deal_link_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deal_number text not null,
  created_at timestamptz not null default now()
);

create index if not exists deal_link_attempts_user_time_idx on public.deal_link_attempts (user_id, created_at);

alter table public.deal_link_attempts enable row level security;

create or replace function public.normalize_last_name(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(coalesce(p, '')), '[^a-z]', '', 'g');
$$;

-- Connects the signed-in customer to a deal. Deliberately answers
-- 'not_found' for every miss — wrong number, wrong name, or a deal that
-- already belongs to someone else — so it can't be used to discover
-- which deal numbers exist. Also hands the customer's private chat to
-- that deal's salesperson, so "message my salesperson" reaches the right
-- person without anyone having to take them off the waiting list.
create or replace function public.link_my_deal(p_deal_number text, p_last_name text)
returns public.deals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_deal public.deals;
  v_failures int;
  v_car text;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  select count(*) into v_failures
  from public.deal_link_attempts
  where user_id = v_uid and created_at > now() - interval '1 hour';

  if v_failures >= 10 then
    raise exception 'too_many_attempts';
  end if;

  select * into v_deal
  from public.deals
  where deal_number = btrim(p_deal_number)
    and public.normalize_last_name(customer_last_name) = public.normalize_last_name(p_last_name)
    and (customer_id is null or customer_id = v_uid);

  if v_deal.id is null then
    insert into public.deal_link_attempts (user_id, deal_number) values (v_uid, left(btrim(p_deal_number), 40));
    raise exception 'not_found';
  end if;

  update public.deals set customer_id = v_uid where id = v_deal.id
  returning * into v_deal;

  if v_deal.salesperson_id is not null then
    v_car := nullif(btrim(concat_ws(' ', v_deal.vehicle_year::text, v_deal.vehicle_make, v_deal.vehicle_model)), '');

    insert into public.chat_threads (customer_id, customer_name, car_label, salesperson_id, salesperson_name, claimed_at)
    values (v_uid, v_deal.customer_name, v_car, v_deal.salesperson_id, v_deal.salesperson_name, now())
    on conflict (customer_id) do nothing;

    update public.chat_threads
    set salesperson_id = v_deal.salesperson_id,
        salesperson_name = v_deal.salesperson_name,
        claimed_at = now(),
        customer_name = coalesce(customer_name, v_deal.customer_name),
        car_label = coalesce(car_label, v_car)
    where customer_id = v_uid and salesperson_id is null;
  end if;

  return v_deal;
end;
$$;

revoke all on function public.link_my_deal(text, text) from public, anon;
grant execute on function public.link_my_deal(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Realtime — status marks and new documents show up live
-- ---------------------------------------------------------------------

alter publication supabase_realtime add table public.deals;
alter publication supabase_realtime add table public.deal_milestones;
alter publication supabase_realtime add table public.deal_files;
