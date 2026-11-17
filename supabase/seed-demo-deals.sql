-- Demo deals for testing and showing the app. Made-up people and cars —
-- never real customer data.
--
-- Run in the Supabase SQL Editor AFTER 20261117120000_deals.sql. Safe to
-- run again: it deletes and recreates the three demo deals (90001–90003).
--
-- Then, in the app, log in as any customer account → My Deal → connect
-- with Deal # 90001 (and 90002, 90003) and last name "Buyer". Each one
-- shows a different flow:
--   90001  regular purchase, Retail Ready 2 days ago → pay-by countdown
--   90002  DEN purchase (Cost Estimate) → cashier's check step
--   90003  selling to UCG, deregistered 5 days ago → "UCG pays you by…"
--
-- The deals are assigned to the first active staff member, so that
-- account's Staff → Deals list shows them too.

delete from public.deals where deal_number in ('90001', '90002', '90003');

with staff as (
  select user_id, display_name from public.staff_members where active order by created_at limit 1
),
inserted as (
  insert into public.deals (
    kind, is_den, deal_number, stock_number, customer_name, customer_last_name,
    salesperson_id, vehicle_year, vehicle_make, vehicle_model, vehicle_color, vin, odometer,
    total_price, deposit, payment_method, lender, document_date, pay_in_full_days
  )
  select v.kind, v.is_den, v.deal_number, v.stock_number, 'Taylor Buyer', 'Buyer',
         (select user_id from staff), v.year, v.make, v.model, v.color, v.vin, v.odometer,
         v.total_price, v.deposit, v.payment_method, null, v.document_date, 7
  from (values
    ('purchase', false, '90001', 'DE9001',  2018, 'Audi', 'Q5 Quattro Premium Plus', 'Blue',   'WDEMO0000000AUDI1', 60000, 25499.00, 300.00, 'cash', current_date - 5),
    ('purchase', true,  '90002', 'DEN9002', 2021, 'Opel', 'Corsa Electric Elegance', 'Blue',   'WDEMO0000000OPEL2',  9100, 20998.00,   0.00, 'cash', current_date - 1),
    ('sale',     false, '90003', 'DE9003',  2017, 'Jeep', 'Cherokee Latitude',       'Silver', 'WDEMO0000000JEEP3', 94370,  5000.00,   0.00, null,  current_date - 20)
  ) as v(kind, is_den, deal_number, stock_number, year, make, model, color, vin, odometer, total_price, deposit, payment_method, document_date)
  returning id, deal_number
)
insert into public.deal_milestones (deal_id, milestone, happened_on, marked_by)
select i.id, m.milestone, m.happened_on, (select user_id from staff)
from inserted i
join (values
  ('90001', 'retail_ready',     current_date - 2),
  ('90003', 'customs_cleared',  current_date - 12),
  ('90003', 'vehicle_received', current_date - 8),
  ('90003', 'deregistered',     current_date - 5)
) as m(deal_number, milestone, happened_on) on m.deal_number = i.deal_number;

select deal_number, kind, is_den, salesperson_name from public.deals where deal_number in ('90001', '90002', '90003');
