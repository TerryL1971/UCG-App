-- Extends deal_documents (introduced last migration for the license
-- photo) to also cover deal paperwork — Cost Estimate / Purchase Order /
-- Bill of Sale (Terry, 2026-09-21: "when documents are produced, they
-- need to be loaded to the app," and a salesperson needs a way to scan a
-- signed copy back in). Reusing the same table/bucket rather than
-- building a parallel system: it's the same underlying question (which
-- customer/car/deal does this file belong to), just more doc_id values
-- now (`cost-estimate`, `purchase-order`, `bill-of-sale`, alongside the
-- existing `license`).
--
-- `kind` distinguishes WHAT a row represents, since that's no longer
-- implied by doc_id alone:
--   'scan'      — a photographed identity document (license front/back).
--                 Existing rows are backfilled to this.
--   'generated' — an app-produced sample PDF, uploaded the moment a
--                 customer actually saves/shares it (not proactively on
--                 every screen view — see document-storage.ts).
--   'signed'    — a photographed/scanned copy of the signed physical
--                 paperwork. There's no separate salesperson-facing
--                 screen in this app (see docs/backend-and-ai-agent-plan.md
--                 on why) — this is captured from the SAME screen the
--                 customer already has open, on the understanding that
--                 signing happens with both people present. Worth
--                 revisiting once a real salesperson-facing surface
--                 exists.
alter table public.deal_documents
  add column if not exists kind text not null default 'scan';

alter table public.deal_documents
  add constraint deal_documents_kind_check check (kind in ('scan', 'generated', 'signed'));

comment on column public.deal_documents.kind is
  'scan (a photographed ID document), generated (an app-produced sample PDF), or signed (a photographed/scanned signed copy of real paperwork).';

create index if not exists deal_documents_kind_idx on public.deal_documents (kind);
