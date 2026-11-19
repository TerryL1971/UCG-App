import { UcgNative } from '../../modules/ucg-native';

import { DEALERSHIPS } from '@/constants/salespeople';
import type { Deal } from '@/lib/deals';
import { isDemoMode } from '@/lib/demo-mode';

/**
 * Reading a deal document so the customer doesn't copy numbers by hand,
 * and checking an AE Form 550 against the deal (Terry, 2026-11-19).
 *
 * Free and on the phone: the app's own native module (modules/ucg-native)
 * pulls the text out of a DealerTeam PDF, or reads a scan with Apple
 * Vision / Google ML Kit. Nothing is sent anywhere, and nothing costs
 * money (Terry, 2026-11-19: no running costs beyond the store fees).
 *
 * The native module only exists in the EAS build. In Expo Go, demo mode
 * shows made-up results and real mode says reading isn't available.
 *
 * The Purchase Order parser is built from what we know of DealerTeam's
 * layout (labels like "Deal #", "Stock #", "Total Price (AE550/VAT
 * Form)"). Tune it against real paperwork.
 */
export const READER_AVAILABLE = UcgNative !== null;

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
  salesperson_name: string | null;
  salesperson_phone: string | null;
  dealership_location: string | null;
  /** Main fields the reader couldn't find. */
  unclear: string[];
}

type Failure = 'not_ready' | 'unreadable' | 'failed';

export type ReadResult = { ok: true; fields: DocumentFields; sample: boolean } | { ok: false; reason: Failure };

export const readFailureMessage: Record<Failure, string> = {
  not_ready: 'Reading paperwork needs the full UCG app. Type the details in for now.',
  unreadable: "The app couldn't read that one. Try a sharper scan in good light, or type the details in.",
  failed: 'Something went wrong reading it. Try again, or type the details in.',
};

// ---------------------------------------------------------------------
// Reading text
// ---------------------------------------------------------------------

async function readLines(uri: string): Promise<string[] | Failure> {
  if (!UcgNative) return 'not_ready';
  try {
    const lines = await UcgNative.readText(uri);
    return lines.join('').replace(/\s/g, '').length < 20 ? 'unreadable' : lines;
  } catch {
    return 'failed';
  }
}

/** Reads a Purchase Order, Cost Estimate or Bill of Sale (a PDF). */
export async function readDocument(pdfUri: string): Promise<ReadResult> {
  if (!READER_AVAILABLE && isDemoMode()) return { ok: true, fields: SAMPLE_PAPERWORK, sample: true };
  const lines = await readLines(pdfUri);
  if (typeof lines === 'string') return { ok: false, reason: lines };
  return { ok: true, fields: parsePaperwork(lines), sample: false };
}

// ---------------------------------------------------------------------
// Parsing paperwork
// ---------------------------------------------------------------------

const MAKES = [
  'Acura', 'Alfa Romeo', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chevy', 'Chrysler', 'Cupra', 'Dodge', 'Fiat',
  'Ford', 'Genesis', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Lincoln',
  'Mazda', 'Mercedes-Benz', 'Mercedes', 'Mini', 'Mitsubishi', 'Nissan', 'Opel', 'Polestar', 'Porsche', 'Ram', 'Seat',
  'Skoda', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'VW', 'Volvo',
];

const money = (s: string) => {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** The value after a label: on the same line, else on the next line. */
function afterLabel(lines: string[], label: RegExp, value: RegExp): string | null {
  for (let i = 0; i < lines.length; i++) {
    const m = label.exec(lines[i]);
    if (!m) continue;
    const rest = lines[i].slice(m.index + m[0].length);
    const same = value.exec(rest);
    if (same) return same[1] ?? same[0];
    const next = lines[i + 1] ? value.exec(lines[i + 1]) : null;
    if (next) return next[1] ?? next[0];
  }
  return null;
}

/** VIN check digit (position 9), used on North American VINs. */
function vinCheckDigitOk(vin: string): boolean {
  const map: Record<string, number> = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6,
    X: 7, Y: 8, Z: 9,
  };
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin[i];
    const v = /\d/.test(c) ? Number(c) : map[c];
    if (v === undefined) return false;
    sum += v * weights[i];
  }
  const check = sum % 11;
  return vin[8] === (check === 10 ? 'X' : String(check));
}

/** Every 17-character VIN-looking string in the text, best first. OCR
 * mixes up O/0, I/1 and Q/0, which a VIN never uses, so those are fixed. */
export function findVins(lines: string[]): string[] {
  const found = new Set<string>();
  const fix = (s: string) => s.toUpperCase().replace(/[OQ]/g, '0').replace(/I/g, '1');
  for (const line of lines) {
    // As printed, and with spaces taken out ("WBA 3A5C5 ...").
    for (const text of [line, line.replace(/(?<=[A-Z0-9])\s(?=[A-Z0-9])/gi, '')]) {
      for (const m of text.toUpperCase().matchAll(/\b[A-Z0-9]{17}\b/g)) {
        const vin = fix(m[0]);
        if (/\d/.test(vin) && /[A-Z]/.test(vin)) found.add(vin);
      }
    }
  }
  return [...found].sort((a, b) => Number(vinCheckDigitOk(b)) - Number(vinCheckDigitOk(a)));
}

function toIso(date: string): string | null {
  const m = /^(\d{1,4})[./-](\d{1,2})[./-](\d{2,4})$/.exec(date.trim());
  if (!m) return null;
  let [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let y: number, mo: number, d: number;
  if (m[1].length === 4) [y, mo, d] = [a, b, c];
  else {
    if (c < 100) c += 2000;
    // Dots are German order (day.month.year); slashes are US (month/day)
    // unless the first number can't be a month.
    const dayFirst = date.includes('.') || a > 12;
    [y, mo, d] = dayFirst ? [c, b, a] : [c, a, b];
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parsePaperwork(lines: string[]): DocumentFields {
  const all = lines.join('\n');
  const document_type: ReadDocType = /cost\s+estimate/i.test(all)
    ? 'cost_estimate'
    : /bill\s+of\s+sale/i.test(all)
      ? 'bill_of_sale'
      : /purchase\s+order/i.test(all)
        ? 'purchase_order'
        : /550-175\s*B/i.test(all)
          ? 'ae550b'
          : /550-175/i.test(all)
            ? 'ae550a'
            : 'other';

  const deal_number = afterLabel(lines, /deal\s*(#|no\.?|number)\s*:?/i, /^\s*(\d{3,10})\b/);
  const stock_number = afterLabel(lines, /stock\s*(#|no\.?|number)\s*:?/i, /^\s*([A-Z]{0,4}-?\d[A-Z0-9-]{1,14})\b/i)?.toUpperCase() ?? null;

  const labelledVin = afterLabel(lines, /\bVIN\b\s*:?/i, /^\s*([A-Z0-9 ]{17,22})/i);
  const vins = findVins(labelledVin ? [labelledVin, ...lines] : lines);
  const vin = vins[0] ?? null;

  let vehicle_year: number | null = null;
  let vehicle_make: string | null = null;
  let vehicle_model: string | null = null;
  const makeRe = new RegExp(`\\b(19[5-9]\\d|20[0-4]\\d)\\s+(${MAKES.map((m) => m.replace('-', '\\-')).join('|')})\\b\\s*(.*)`, 'i');
  for (const line of lines) {
    const m = makeRe.exec(line);
    if (m) {
      vehicle_year = Number(m[1]);
      vehicle_make = MAKES.find((k) => k.toLowerCase() === m[2].toLowerCase()) ?? m[2];
      // The model runs until a wide gap or the next label.
      vehicle_model = m[3].split(/\s{3,}|\b(VIN|Stock|Color|Colour|Odometer|Mileage)\b/i)[0].trim().slice(0, 40) || null;
      break;
    }
  }
  const vehicle_color = afterLabel(lines, /\b(colou?r|exterior)\s*:?/i, /^\s*([A-Za-z][A-Za-z /-]{2,20})/)?.trim() ?? null;
  const odometerText = afterLabel(lines, /\b(odometer|mileage|miles)\s*:?/i, /^\s*([\d.,]{2,9})/);
  const odometer = odometerText ? Math.round(Number(odometerText.replace(/[.,]/g, ''))) || null : null;

  // "Total Price" — never the Cost Estimate's larger MWST "Total Amount".
  const priceText = afterLabel(lines, /total\s+(vehicle\s+)?price[^$\d]*/i, /\$?\s*([\d.,]+\d)/);
  const total_price = priceText ? money(priceText) : null;
  const depositText = document_type === 'purchase_order' ? afterLabel(lines, /deposit[^$\d]*/i, /\$?\s*([\d.,]+\d)/) : null;
  const deposit = depositText ? money(depositText) : null;

  const dateText = afterLabel(
    lines,
    /\b(deal\s+date|purchase\s+date|date)\s*:?/i,
    /^\s*(\d{1,4}[./-]\d{1,2}[./-]\d{2,4})/,
  );
  const document_date = dateText ? toIso(dateText) : null;

  const salesperson_name = afterLabel(
    lines,
    /\b(sales\s*person|sales\s*consultant|salesman|sales\s*rep)\s*:?/i,
    /^\s*([A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,2})/,
  );
  const salesperson_phone = afterLabel(
    lines,
    /\b(sales\s*person|sales\s*consultant|mobile|cell|whatsapp)\b[^+\d]*/i,
    /(\+?\d[\d\s/()-]{8,}\d)/,
  );
  const dealership_location = DEALERSHIPS.find((d) => new RegExp(`\\b${d}\\b`, 'i').test(all)) ?? null;

  const fields: DocumentFields = {
    document_type,
    deal_number,
    stock_number,
    vin,
    vehicle_year,
    vehicle_make,
    vehicle_model,
    vehicle_color,
    odometer,
    total_price,
    deposit,
    document_date,
    salesperson_name,
    salesperson_phone,
    dealership_location,
    unclear: [],
  };
  const main: [keyof DocumentFields, string][] = [
    ['deal_number', 'Deal #'],
    ['stock_number', 'Stock #'],
    ['vin', 'VIN'],
    ['total_price', 'Total Price'],
  ];
  fields.unclear = main.filter(([k]) => fields[k] === null).map(([, label]) => label);
  return fields;
}

// ---------------------------------------------------------------------
// Checking a 550 against the deal
// ---------------------------------------------------------------------

export interface FieldCheck {
  label: string;
  onForm: string;
  onDeal: string;
}

export type CheckResult =
  | { ok: true; sample: boolean; mismatches: FieldCheck[]; notFound: string[] }
  | { ok: false; reason: Failure };

const nameWords = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 1);

/**
 * Checks a scanned 550 against the deal (Terry's rules, 2026-11-17: VIN,
 * name and price must match). Rather than guessing which box is which on
 * a hand-typed form, it looks for the deal's own values in the text:
 *   - VIN found → fine. A different VIN found → mismatch, shown.
 *   - Name or price not found → "check by eye" (it may be a typo on the
 *     form, or the scan may just be unclear).
 */
export async function check550(pdfUri: string, deal: Deal): Promise<CheckResult> {
  if (!READER_AVAILABLE && isDemoMode()) {
    // The demo 550 has one VIN character typed wrong, the mistake base
    // customs offices really make when they key the form in by hand.
    const wrong = deal.vin.length > 3 ? `${deal.vin.slice(0, -3)}8${deal.vin.slice(-2)}` : deal.vin;
    return { ok: true, sample: true, mismatches: [{ label: 'VIN', onForm: wrong, onDeal: deal.vin }], notFound: [] };
  }
  const lines = await readLines(pdfUri);
  if (typeof lines === 'string') return { ok: false, reason: lines };

  const compact = lines.join(' ').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const mismatches: FieldCheck[] = [];
  const notFound: string[] = [];

  const dealVin = deal.vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!compact.replace(/[OQ]/g, '0').replace(/I/g, '1').includes(dealVin)) {
    const other = findVins(lines).find((v) => v !== dealVin);
    if (other) mismatches.push({ label: 'VIN', onForm: other, onDeal: deal.vin });
    else notFound.push('the VIN');
  }

  const last = nameWords(deal.customer_last_name || deal.customer_name).pop();
  if (last && !nameWords(lines.join(' ')).includes(last)) notFound.push(`your last name (${deal.customer_last_name || last})`);

  const price = Math.round(Number(deal.total_price));
  const digits = lines.join(' ').replace(/(?<=\d)[.,\s](?=\d{3}\b)/g, '');
  if (price > 0 && !new RegExp(`\\b${price}\\b`).test(digits)) {
    notFound.push(`the price ($${price.toLocaleString('en-US')})`);
  }

  return { ok: true, sample: false, mismatches, notFound };
}

// ---------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------

/** Made-up paperwork, so a demo in Expo Go still shows the idea. */
const SAMPLE_PAPERWORK: DocumentFields = {
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
  document_date: null,
  salesperson_name: 'Demo Salesperson',
  salesperson_phone: null,
  dealership_location: null,
  unclear: [],
};
