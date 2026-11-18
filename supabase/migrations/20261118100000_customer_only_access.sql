-- Customer-only access (Terry, 2026-11-18, gap review).
--
-- No UCG employee uses the app any more (decision 2026-11-17), so no
-- account other than the customer's own may read or change a customer's
-- deals, ticks or documents. This removes every "staff" path and the
-- leftovers from the old, pre-account document upload.
--
-- Left in place, unused: the chat tables (old test conversations, still
-- readable only by their own customer), staff_members (now empty), and
-- the legacy deal_documents table/documents bucket (no new writes).

-- ---------------------------------------------------------------------
-- Deals, ticks and documents: the customer only
-- ---------------------------------------------------------------------

drop policy if exists "Staff create deals" on public.deals;
drop policy if exists "Staff update deals" on public.deals;
drop policy if exists "Customers read their deals, staff read all" on public.deals;
create policy "Customers read their own deals" on public.deals
  for select to authenticated
  using (customer_id = auth.uid());

drop policy if exists "Staff set status marks" on public.deal_milestones;
drop policy if exists "Staff undo status marks" on public.deal_milestones;

drop policy if exists "Participants add documents as themselves" on public.deal_files;
create policy "Customers add documents to their own deals" on public.deal_files
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and replaced_at is null
    and exists (select 1 from public.deals d where d.id = deal_id and d.customer_id = auth.uid())
  );

-- Used by the read policies on ticks, documents and storage files.
create or replace function public.can_access_deal(p_deal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.deals d where d.id = p_deal_id and d.customer_id = auth.uid());
$$;

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
      and d.customer_id = auth.uid()
  );
$$;

-- The old "connect with Deal # + last name" flow (staff created deals).
drop function if exists public.link_my_deal(text, text);

-- No staff accounts.
delete from public.staff_members;

-- ---------------------------------------------------------------------
-- Legacy anonymous document upload (before accounts existed)
-- ---------------------------------------------------------------------

-- Anyone holding the public app key could upload files here and add rows.
drop policy if exists "Allow uploads to documents bucket" on storage.objects;
drop policy if exists "Allow inserts from the app" on public.deal_documents;
