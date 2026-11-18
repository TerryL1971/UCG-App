-- Key Dates (Terry, 2026-11-18 gap review): dates the customer enters so
-- the app can remind them — like the Boris PCS app's "Document Dates".
--   registration_expires  from the TT Doc ("Expires") — renew in time
--   ae550b_issued         when selling: the 550-175B is valid 90 days
-- (The USAREUR license expiry belongs to the person, not a deal, so it's
-- kept on the account.)
alter table public.deals add column if not exists registration_expires date;
alter table public.deals add column if not exists ae550b_issued date;
