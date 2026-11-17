-- UCG's pay-in-full window is 5 days for now (Terry, 2026-11-17), not
-- the 7 printed in the Purchase Order's term 2. Only the default for new
-- deals changes; staff can still set any number per deal.
alter table public.deals alter column pay_in_full_days set default 5;
