-- Backs lookup-deal-documents (the Edge Function a customer's app calls
-- to retrieve their own documents by deal code). This table is written
-- and read ONLY by that function using the service-role key — nothing
-- in the client app touches it directly, so no RLS policies are needed
-- here (RLS defaults to fully closed with no policies, which is correct:
-- the anon key should never be able to read or write this table).
--
-- Deal codes (document-storage.ts's getOwnerId, 8 characters from a
-- 32-symbol alphabet) are a deliberately lighter-weight stand-in for
-- real per-customer auth — Terry, 2026-09-21, accepted that tradeoff
-- explicitly rather than building real accounts right now. A basic
-- per-IP rate limit is the minimum protection against someone just
-- guessing codes; this table is what that limit is counted against.
create table if not exists public.deal_code_lookup_attempts (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  client_ip text,
  found boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists deal_code_lookup_attempts_ip_time_idx
  on public.deal_code_lookup_attempts (client_ip, created_at);

alter table public.deal_code_lookup_attempts enable row level security;
-- No policies added on purpose — RLS with zero policies denies every
-- row to every client-side role (anon, authenticated). Only the
-- service-role key (used exclusively inside the Edge Function, never
-- shipped to the app) can read or write this table.
