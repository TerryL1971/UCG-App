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
 * Other team members customers deal with (registration, logistics…) go
 * here too, with a `role` — they show up in the customer's "Your UCG
 * team" card for that dealership (Terry, 2026-11-18: customers had to ask
 * for the registration contact's number):
 *
 *   { name: 'Alex Doe', dealership: 'Stuttgart', whatsapp: '49…', role: 'Registration' },
 *
 * `whatsapp` = digits only, country code first, no '+' or spaces (the
 * format WhatsApp links need). Until the list is in, customers type their
 * salesperson's name and WhatsApp number themselves.
 */
export interface Salesperson {
  name: string;
  dealership: string;
  whatsapp: string;
  /** Omitted = salesperson. */
  role?: 'Sales' | 'Registration' | 'Logistics' | 'Office';
}

export const SALESPEOPLE: Salesperson[] = [];

/** Team members at a dealership other than salespeople (registration,
 * logistics…), for the "Your UCG team" card. */
export function dealershipTeam(dealership: string | null | undefined): Salesperson[] {
  if (!dealership) return [];
  return SALESPEOPLE.filter((p) => p.dealership === dealership && p.role && p.role !== 'Sales');
}

/** Showroom opening hours, where known. Stuttgart from Terry's own
 * customer messages (2026-11-18). Add the others as they're confirmed. */
export const SHOWROOM_HOURS: Record<string, string> = {
  Stuttgart: 'Mon–Fri 09:00–18:00 · Sat 10:00–15:00',
};

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
