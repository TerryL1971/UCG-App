-- Customer-run deals (Terry, 2026-11-17).
--
-- Decision: only the customer logs into the app — no UCG employee does.
-- Salespeople keep working in DealerTeam and WhatsApp. So the customer
-- sets up their own deal from their paperwork (Purchase Order, Cost
-- Estimate or Bill of Sale, all of which they have once the $300 deposit
-- is taken), and ticks off steps their salesperson tells them about on
-- WhatsApp. The app is the customer's guide and document wallet, the way
-- the Boris PCS app is for a move — not UCG's system of record.
--
-- The staff policies from 20261117120000_deals.sql are left in place
-- (harmless: there are no staff users of the app).

-- The salesperson is now just who the customer deals with on WhatsApp.
alter table public.deals alter column salesperson_id drop default;
alter table public.deals add column if not exists salesperson_whatsapp text;
alter table public.deals add column if not exists dealership text;

-- Deal numbers are typed by customers now: two customers could mistype
-- the same number, and a unique constraint would also reveal that a
-- number exists. Each customer only ever sees their own deals anyway.
alter table public.deals drop constraint if exists deals_deal_number_key;

create policy "Customers create their own deals" on public.deals
  for insert to authenticated
  with check (customer_id = auth.uid());

create policy "Customers update their own deals" on public.deals
  for update to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "Customers delete their own deals" on public.deals
  for delete to authenticated
  using (customer_id = auth.uid());

-- Customers tick their own steps ("my salesperson says my car is Retail
-- Ready").
create policy "Customers tick steps on their own deals" on public.deal_milestones
  for insert to authenticated
  with check (
    marked_by = auth.uid()
    and exists (select 1 from public.deals d where d.id = deal_id and d.customer_id = auth.uid())
  );

create policy "Customers untick steps on their own deals" on public.deal_milestones
  for delete to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_id and d.customer_id = auth.uid()));

-- Who ticked it: a staff name if ever staff, otherwise the customer.
create or replace function public.deal_milestones_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select display_name into new.marked_by_name
  from public.staff_members where user_id = new.marked_by;
  if new.marked_by_name is null then
    select customer_name into new.marked_by_name
    from public.deals where id = new.deal_id and customer_id = new.marked_by;
  end if;
  return new;
end;
$$;
