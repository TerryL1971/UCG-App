import type { Deal } from '@/lib/deals';
import { isDemoMode } from '@/lib/demo-mode';

/**
 * Reading a deal document so the customer doesn't copy numbers by hand,
 * and checking an AE Form 550 against the deal (Terry, 2026-11-19).
 *
 * The app must cost nothing to run beyond the app-store fees (Terry,
 * 2026-11-19), so there is no paid AI reader. For now only demo mode
 * "reads" (with made-up results). The free way to do it for real:
 *   - DealerTeam PDFs (Purchase Order, Cost Estimate, Bill of Sale) have
 *     their text inside, so it can be pulled out without OCR and matched
 *     to the known layout. Needs a real Purchase Order to build against.
 *   - Scanned paper (the 550s) needs OCR on the phone itself (Apple
 *     Vision / Google ML Kit, both free), which needs the EAS build.
 * Flip READER_AVAILABLE when one of these is in.
 */
export const READER_AVAILABLE = false;

export type ReadDocType = 'purchase_order' | 'cost_estimate' | 'bill_of_sale' | 'ae550a' | 'ae550b' | 'other';

export interface DocumentFields {
  document_type: ReadDocType;
  deal_number: string | null;
  stock_number: string | null;
  vin: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  odometer: number | null;
  total_price: number | null;
  deposit: number | null;
  document_date: string | null;
  customer_name: string | null;
  salesperson_name: string | null;
  salesperson_phone: string | null;
  dealership_location: string | null;
  lender: string | null;
  /** Fields the reader couldn't read with confidence. */
  unclear: string[];
}

export type ReadResult =
  | { ok: true; fields: DocumentFields; sample: boolean }
  | { ok: false; reason: 'offline' | 'not_signed_in' | 'not_ready' | 'unreadable' | 'too_large' | 'failed' };

export const readFailureMessage: Record<Exclude<ReadResult, { ok: true }>['reason'], string> = {
  offline: "Couldn't reach UCG. Check your connection and try again.",
  not_signed_in: 'Log in to have the app read your paperwork.',
  not_ready: "Reading paperwork isn't switched on yet. Type the details in for now.",
  unreadable: "The app couldn't read that one. Try a sharper scan in good light, or type the details in.",
  too_large: 'That file is too big to read. Try scanning just the front page.',
  failed: 'Something went wrong reading it. Try again, or type the details in.',
};

/** Made-up results so a demo never depends on the network or real paper. */
function sampleFields(kind: 'paperwork' | 'ae550', deal?: Deal): DocumentFields {
  if (kind === 'ae550' && deal) {
    // The demo 550 has one VIN character typed wrong, the mistake base
    // customs offices really make when they key the form in by hand.
    const vin = deal.vin.length > 3 ? `${deal.vin.slice(0, -3)}8${deal.vin.slice(-2)}` : deal.vin;
    return {
      ...EMPTY,
      document_type: deal.kind === 'sale' ? 'ae550b' : 'ae550a',
      vin,
      vehicle_year: deal.vehicle_year,
      vehicle_make: deal.vehicle_make,
      vehicle_model: deal.vehicle_model,
      total_price: Number(deal.total_price),
      customer_name: deal.customer_name,
    };
  }
  return {
    ...EMPTY,
    document_type: 'purchase_order',
    deal_number: '90010',
    stock_number: 'DE9010',
    vin: 'WDEMO0000000BMW10',
    vehicle_year: 2020,
    vehicle_make: 'BMW',
    vehicle_model: 'X3 xDrive30i',
    vehicle_color: 'Black',
    odometer: 48500,
    total_price: 31499,
    deposit: 300,
    salesperson_name: 'Demo Salesperson',
  };
}

const EMPTY: DocumentFields = {
  document_type: 'other',
  deal_number: null,
  stock_number: null,
  vin: null,
  vehicle_year: null,
  vehicle_make: null,
  vehicle_model: null,
  vehicle_color: null,
  odometer: null,
  total_price: null,
  deposit: null,
  document_date: null,
  customer_name: null,
  salesperson_name: null,
  salesperson_phone: null,
  dealership_location: null,
  lender: null,
  unclear: [],
};

/**
 * Reads a local PDF (a scan from the app, or a PDF the customer added).
 * Demo mode returns made-up results; there is no real reader yet.
 */
export async function readDocument(_pdfUri: string, kind: 'paperwork' | 'ae550', deal?: Deal): Promise<ReadResult> {
  if (isDemoMode()) return { ok: true, fields: sampleFields(kind, deal), sample: true };
  return { ok: false, reason: 'not_ready' };
}

// ---------------------------------------------------------------------
// Checking a 550 against the deal
// ---------------------------------------------------------------------

export interface FieldCheck {
  label: string;
  onForm: string;
  onDeal: string;
  /** mismatch = must be fixed at the counter; check = probably fine, look. */
  severity: 'mismatch' | 'check';
}

const clean = (s: string) => s.replace(/[^A-Z0-9]/gi, '').toUpperCase();
const nameWords = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 1);

/**
 * What on the form doesn't match the deal. Following Terry's rules
 * (2026-11-17): VIN, names, prices and stock numbers must match exactly;
 * mileage and model wording can differ a little, so they're a "check".
 * Fields the form doesn't show (or the reader couldn't read) are skipped.
 */
export function checkAgainstDeal(fields: DocumentFields, deal: Deal): FieldCheck[] {
  const out: FieldCheck[] = [];
  if (fields.vin && clean(fields.vin) !== clean(deal.vin)) {
    out.push({ label: 'VIN', onForm: fields.vin, onDeal: deal.vin, severity: 'mismatch' });
  }
  if (fields.stock_number && clean(fields.stock_number) !== clean(deal.stock_number)) {
    out.push({ label: 'Stock #', onForm: fields.stock_number, onDeal: deal.stock_number, severity: 'mismatch' });
  }
  if (fields.total_price !== null && Math.abs(fields.total_price - Number(deal.total_price)) >= 1) {
    out.push({
      label: 'Price',
      onForm: `$${fields.total_price.toLocaleString('en-US')}`,
      onDeal: `$${Number(deal.total_price).toLocaleString('en-US')}`,
      severity: 'mismatch',
    });
  }
  if (fields.customer_name) {
    const onForm = nameWords(fields.customer_name);
    const last = nameWords(deal.customer_last_name || deal.customer_name).pop();
    if (last && !onForm.includes(last)) {
      out.push({ label: 'Name', onForm: fields.customer_name, onDeal: deal.customer_name, severity: 'mismatch' });
    }
  }
  if (fields.vehicle_year && deal.vehicle_year && fields.vehicle_year !== deal.vehicle_year) {
    out.push({ label: 'Year', onForm: String(fields.vehicle_year), onDeal: String(deal.vehicle_year), severity: 'mismatch' });
  }
  if (fields.odometer !== null && deal.odometer !== null && Math.abs(fields.odometer - deal.odometer) > 1000) {
    out.push({
      label: 'Mileage',
      onForm: fields.odometer.toLocaleString('en-US'),
      onDeal: deal.odometer.toLocaleString('en-US'),
      severity: 'check',
    });
  }
  if (fields.vehicle_make && deal.vehicle_make && !nameWords(fields.vehicle_make).some((w) => nameWords(deal.vehicle_make!).includes(w))) {
    out.push({ label: 'Make', onForm: fields.vehicle_make, onDeal: deal.vehicle_make, severity: 'check' });
  }
  return out;
}
