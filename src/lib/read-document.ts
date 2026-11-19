import * as FileSystem from 'expo-file-system/legacy';

import type { Deal } from '@/lib/deals';
import { isDemoMode } from '@/lib/demo-mode';
import { supabase } from '@/lib/supabase';

/**
 * Reads a deal document with AI (the read-document Edge Function, which
 * calls Claude server-side) so the customer doesn't copy numbers by hand,
 * and checks an AE Form 550 against the deal (Terry, 2026-11-19).
 *
 * Nothing is saved from here: the fields come back to the screen, and the
 * customer checks them against the paper before anything is stored.
 */

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
 * In demo mode it falls back to made-up results when the real reader
 * can't run (not logged in, or not switched on yet).
 */
export async function readDocument(pdfUri: string, kind: 'paperwork' | 'ae550', deal?: Deal): Promise<ReadResult> {
  const demoFallback = (): ReadResult => ({ ok: true, fields: sampleFields(kind, deal), sample: true });
  if (!supabase) return isDemoMode() ? demoFallback() : { ok: false, reason: 'not_ready' };
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return isDemoMode() ? demoFallback() : { ok: false, reason: 'not_signed_in' };

  let file: string;
  try {
    file = await FileSystem.readAsStringAsync(pdfUri, { encoding: 'base64' });
  } catch {
    return { ok: false, reason: 'failed' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('read-document', {
      method: 'POST',
      body: { file, mimeType: 'application/pdf' },
    });
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 503 || status === 404) return isDemoMode() ? demoFallback() : { ok: false, reason: 'not_ready' };
      if (status === 401) return { ok: false, reason: 'not_signed_in' };
      if (status === 413) return { ok: false, reason: 'too_large' };
      if (status === 422) return { ok: false, reason: 'unreadable' };
      if (!status) return { ok: false, reason: 'offline' };
      return { ok: false, reason: 'failed' };
    }
    const fields = (data as { fields?: DocumentFields } | null)?.fields;
    return fields ? { ok: true, fields, sample: false } : { ok: false, reason: 'failed' };
  } catch {
    return { ok: false, reason: 'offline' };
  }
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
