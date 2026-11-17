import {
  demoCreateDeal,
  demoFetchDealBundle,
  demoFetchMyDeals,
  demoFetchStaffDeals,
  demoFileUri,
  demoLinkMyDeal,
  demoSetMilestone,
  demoSubscribe,
  demoUpdateDeal,
  demoUploadDealFile,
} from '@/lib/deals-demo';
import { isDemoMode } from '@/lib/demo-mode';
import { supabase } from '@/lib/supabase';

/**
 * Deals, status marks and deal documents — the client side of the
 * 20261117120000_deals migration (read that file's header for the why).
 * Who can see or change what is enforced there by RLS, not here.
 *
 * In demo mode (lib/demo-mode.ts) every function below answers from the
 * mock store in lib/deals-demo.ts instead.
 */

export type DealKind = 'purchase' | 'sale';
export type PaymentMethod = 'cash' | 'finance';

export interface Deal {
  id: string;
  kind: DealKind;
  is_den: boolean;
  deal_number: string;
  stock_number: string;
  customer_name: string;
  customer_last_name: string;
  customer_id: string | null;
  salesperson_id: string | null;
  salesperson_name: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vin: string;
  odometer: number | null;
  /** Postgres numeric — arrives as a string or number depending on size. */
  total_price: number | string;
  deposit: number | string;
  payment_method: PaymentMethod | null;
  lender: string | null;
  /** ISO date (yyyy-mm-dd). */
  document_date: string;
  pay_in_full_days: number;
  created_at: string;
  updated_at: string;
}

export type Milestone =
  | 'retail_ready'
  | 'paid_in_full'
  | 'customs_cleared'
  | 'tuv_release'
  | 'registration_packet'
  | 'delivered'
  | 'vehicle_received'
  | 'deregistered'
  | 'paid_out';

export interface DealMilestone {
  deal_id: string;
  milestone: Milestone;
  /** ISO date — when it actually happened (e.g. the deregistration date). */
  happened_on: string;
  marked_at: string;
  marked_by: string | null;
  marked_by_name: string | null;
}

export type DocType =
  | 'purchase_order'
  | 'cost_estimate'
  | 'bill_of_sale'
  | 'warranty_certificate'
  | 'hand_over'
  | 'ae550a'
  | 'ae550a_stamped'
  | 'ae550b'
  | 'ae550b_stamped'
  | 'vat_form'
  | 'cashiers_check'
  | 'loan_approval'
  | 'tuv'
  | 'tt_doc'
  | 'registration'
  | 'title'
  | 'lien_release'
  | 'payoff_letter'
  | 'registration_memo'
  | 'deregistration'
  | 'license'
  | 'other';

export interface DealFile {
  id: string;
  deal_id: string;
  doc_type: DocType;
  storage_path: string;
  page_count: number;
  uploaded_by: string | null;
  uploaded_by_role: 'customer' | 'staff';
  uploaded_by_name: string | null;
  replaced_at: string | null;
  created_at: string;
}

/** Everything one deal screen needs. */
export interface DealBundle {
  deal: Deal;
  milestones: DealMilestone[];
  files: DealFile[];
}

const BUCKET = 'deal-files';

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function bundlesFor(deals: Deal[]): Promise<DealBundle[]> {
  if (deals.length === 0) return [];
  const ids = deals.map((d) => d.id);
  const [milestones, files] = await Promise.all([
    client().from('deal_milestones').select('*').in('deal_id', ids),
    client().from('deal_files').select('*').in('deal_id', ids).order('created_at', { ascending: false }),
  ]);
  if (milestones.error) throw milestones.error;
  if (files.error) throw files.error;
  return deals.map((deal) => ({
    deal,
    milestones: (milestones.data as DealMilestone[]).filter((m) => m.deal_id === deal.id),
    files: (files.data as DealFile[]).filter((f) => f.deal_id === deal.id),
  }));
}

/** The signed-in customer's own deals, newest first. */
export async function fetchMyDeals(userId: string): Promise<DealBundle[]> {
  if (isDemoMode()) return demoFetchMyDeals();
  const { data, error } = await client()
    .from('deals')
    .select('*')
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return bundlesFor(data as Deal[]);
}

export async function fetchDealBundle(dealId: string): Promise<DealBundle | null> {
  if (isDemoMode()) return demoFetchDealBundle(dealId);
  const { data, error } = await client().from('deals').select('*').eq('id', dealId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [bundle] = await bundlesFor([data as Deal]);
  return bundle;
}

export type LinkResult =
  | { ok: true; deal: Deal }
  | { ok: false; reason: 'not_found' | 'too_many_attempts' | 'error' };

/** Deal # + last name → connects the deal to the signed-in account. */
export async function linkMyDeal(dealNumber: string, lastName: string): Promise<LinkResult> {
  if (isDemoMode()) return demoLinkMyDeal(dealNumber, lastName);
  const { data, error } = await client().rpc('link_my_deal', {
    p_deal_number: dealNumber.trim(),
    p_last_name: lastName.trim(),
  });
  if (error) {
    if (error.message.includes('not_found')) return { ok: false, reason: 'not_found' };
    if (error.message.includes('too_many_attempts')) return { ok: false, reason: 'too_many_attempts' };
    console.error('link_my_deal failed:', error.message);
    return { ok: false, reason: 'error' };
  }
  return { ok: true, deal: data as Deal };
}

// ---------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------

/** All deals (RLS returns everything to active staff), newest first. */
export async function fetchStaffDeals(): Promise<Deal[]> {
  if (isDemoMode()) return demoFetchStaffDeals();
  const { data, error } = await client().from('deals').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data as Deal[];
}

export type NewDeal = Pick<
  Deal,
  | 'kind'
  | 'is_den'
  | 'deal_number'
  | 'stock_number'
  | 'customer_name'
  | 'customer_last_name'
  | 'vehicle_year'
  | 'vehicle_make'
  | 'vehicle_model'
  | 'vehicle_color'
  | 'vin'
  | 'odometer'
  | 'total_price'
  | 'deposit'
  | 'payment_method'
  | 'lender'
  | 'document_date'
  | 'pay_in_full_days'
>;

export type SaveDealResult = { ok: true; deal: Deal } | { ok: false; reason: 'duplicate_deal_number' | 'error'; message?: string };

function saveError(error: { code?: string; message: string }): SaveDealResult {
  if (error.code === '23505') return { ok: false, reason: 'duplicate_deal_number' };
  return { ok: false, reason: 'error', message: error.message };
}

export async function createDeal(input: NewDeal): Promise<SaveDealResult> {
  if (isDemoMode()) return demoCreateDeal(input);
  const { data, error } = await client().from('deals').insert(input).select('*').single();
  if (error) return saveError(error);
  return { ok: true, deal: data as Deal };
}

export async function updateDeal(dealId: string, input: Partial<NewDeal>): Promise<SaveDealResult> {
  if (isDemoMode()) return demoUpdateDeal(dealId, input);
  const { data, error } = await client().from('deals').update(input).eq('id', dealId).select('*').single();
  if (error) return saveError(error);
  return { ok: true, deal: data as Deal };
}

export async function setMilestone(
  dealId: string,
  milestone: Milestone,
  done: boolean,
  userId: string,
  happenedOn?: string,
): Promise<void> {
  if (isDemoMode()) return demoSetMilestone(dealId, milestone, done, happenedOn);
  if (done) {
    const { error } = await client()
      .from('deal_milestones')
      .insert({ deal_id: dealId, milestone, marked_by: userId, ...(happenedOn ? { happened_on: happenedOn } : {}) });
    // Already marked (e.g. two taps, or a colleague got there first) is fine.
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await client().from('deal_milestones').delete().eq('deal_id', dealId).eq('milestone', milestone);
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Uploads one local PDF (file:// uri) for a deal and records it. A newer
 * upload of the same document type marks the older one as replaced
 * (database trigger) — nothing is ever deleted.
 */
export async function uploadDealFile(params: {
  dealId: string;
  docType: DocType;
  localPdfUri: string;
  pageCount: number;
  role: 'customer' | 'staff';
  userId: string;
}): Promise<DealFile> {
  if (isDemoMode()) return demoUploadDealFile(params);
  const path = `${params.dealId}/${params.docType}-${randomId()}.pdf`;
  // fetch(uri) → arrayBuffer() is the reliable way to read a local file
  // for Storage on React Native (a Blob isn't).
  const response = await fetch(params.localPdfUri);
  const body = await response.arrayBuffer();
  const upload = await client().storage.from(BUCKET).upload(path, body, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const { data, error } = await client()
    .from('deal_files')
    .insert({
      deal_id: params.dealId,
      doc_type: params.docType,
      storage_path: path,
      page_count: params.pageCount,
      uploaded_by: params.userId,
      uploaded_by_role: params.role,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as DealFile;
}

/** A short-lived link for viewing or sharing one document. */
export async function signedFileUrl(storagePath: string, expiresInSeconds = 600): Promise<string> {
  // Demo mode: a local file:// uri (callers open/share it directly).
  if (isDemoMode()) return demoFileUri(storagePath);
  const { data, error } = await client().storage.from(BUCKET).createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) throw error ?? new Error('No signed URL');
  return data.signedUrl;
}

// ---------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------

/** Calls `onChange` on any change to deals, status marks or documents the
 * user can see. Callers just refetch — simpler than patching state. */
export function subscribeToDealChanges(key: string, onChange: () => void): () => void {
  if (isDemoMode()) return demoSubscribe(onChange);
  const channel = client()
    .channel(`deals-${key}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deal_milestones' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deal_files' }, onChange)
    .subscribe();
  return () => {
    client().removeChannel(channel);
  };
}
