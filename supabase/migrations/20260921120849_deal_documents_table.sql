-- A row per uploaded document page, tying the file that landed in the
-- `documents` Storage bucket back to who/what it actually belongs to.
--
-- Before this, document-storage.ts uploaded a file to Storage with
-- nothing but an anonymous folder name — a salesperson looking in the
-- bucket had a photo with zero context: no customer, no car, no deal
-- (Terry, 2026-09-21: "There is no table for the documents to match
-- them with a customer, car, deal number, etc???" — correct, there
-- wasn't). This table is that missing context.
--
-- There's no real "deal number" yet — DealerTeam/Salesforce integration
-- (docs/salesforce-dealerteam-integration-plan.md) is what would
-- eventually assign one. owner_id (the anonymous per-install id from
-- document-storage.ts, or a real auth.uid() once accounts are
-- meaningful) is the closest stand-in today: it's what actually groups
-- a customer's uploads together across multiple documents/sessions.
-- customer_name/contact/car_*/base are captured at upload time from
-- whatever the app already knows (deal-intake + the chosen car) so a
-- salesperson has something to search/filter by *today*, without
-- waiting on that integration.
create table if not exists public.deal_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  doc_id text not null,
  storage_path text not null unique,
  customer_name text,
  customer_contact text,
  car_stock_number text,
  car_title text,
  base text,
  created_at timestamptz not null default now()
);

comment on table public.deal_documents is
  'One row per page uploaded to the documents Storage bucket, with whatever customer/car/deal context the app knew at upload time. See migration file comment for why owner_id (not a real deal number) is the grouping key today.';

alter table public.deal_documents enable row level security;

-- Matches the Storage bucket's own posture (see the "Allow uploads to
-- documents bucket" policy on storage.objects): the app writes rows for
-- both anon and authenticated customers — "Browse without an account" is
-- a normal, supported path through this app, so this can't require a
-- real auth session. No SELECT policy is granted here on purpose —
-- reading this table (to actually retrieve/search documents) happens
-- from the Supabase dashboard's own privileged access today, not from
-- the app itself. Add a real SELECT policy once there's a salesperson-
-- facing screen and a real notion of who's allowed to see what.
create policy "Allow inserts from the app" on public.deal_documents
  for insert
  to anon, authenticated
  with check (true);

create index if not exists deal_documents_owner_id_idx on public.deal_documents (owner_id);
