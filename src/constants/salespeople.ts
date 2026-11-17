import { ucgLocations } from '@/constants/ucg-info';

/**
 * UCG salespeople and the dealership each works at — so the customer can
 * pick theirs, and "Message my salesperson" opens WhatsApp to the right
 * person (Terry, 2026-11-17: WhatsApp is how UCG talks to customers; no
 * UCG employee logs into the app).
 *
 * Terry is getting the full list. Add each person here:
 *
 *   { name: 'Jane Smith', dealership: 'Ramstein', whatsapp: '4917612345678' },
 *
 * `whatsapp` = digits only, country code first, no '+' or spaces (the
 * format WhatsApp links need). Until the list is in, customers type their
 * salesperson's name and WhatsApp number themselves.
 */
export interface Salesperson {
  name: string;
  dealership: string;
  whatsapp: string;
}

export const SALESPEOPLE: Salesperson[] = [];

/** UCG dealership locations. */
export const DEALERSHIPS: string[] = ucgLocations.map((l) => l.name);

/** "+49 0151 6522 7520" / "0049…" / "015165227520" → "4915165227520".
 * German numbers starting with a single 0 get the 49 country code. */
export function normalizeWhatsapp(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `49${digits.slice(1)}`;
  digits = digits.replace(/\D/g, '');
  // German numbers written "+49 015…" keep a stray trunk 0 — drop it.
  if (digits.startsWith('490')) digits = `49${digits.slice(3)}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}
