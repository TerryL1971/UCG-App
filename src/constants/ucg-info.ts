import { BASES } from '@/constants/bases';

/**
 * Real UCG facts the app still needs after the Nov 2026 pivot (the old
 * constants/mock-data.ts held these alongside simulated deal data that
 * no longer exists — deals now come from Supabase, see lib/deals.ts).
 */

/**
 * UCG's general WhatsApp inbox — only used as a fallback when the in-app
 * chat isn't available (no Supabase configured). Real, not a guess: Terry found this exact number
 * (wa.me/491737656926) linked from TWO live pages on usedcarguys.net —
 * the service-center page AND the sell-your-vehicle page — so this is
 * UCG's actual general WhatsApp inbox, not the wire-transfer-support
 * number this constant used to borrow as a stand-in. Still worth
 * confirming it's the exact Trengo-connected inbox (vs. some other
 * routing) before launch, but no longer a guess.
 */
export const SUPPORT_WHATSAPP = '491737656926';

/**
 * wa.me is WhatsApp's official "click to chat" link format — reliable and
 * documented. There's deliberately no equivalent "start a call" link here:
 * WhatsApp doesn't publish a way to auto-dial a voice call from outside the
 * app the way `tel:` does, so "Call" opens the chat too (one tap from the
 * real call button inside WhatsApp) rather than faking a one-tap call that
 * wouldn't actually work.
 */
export function whatsappChatUrl(phoneDigits: string, message?: string): string {
  const base = `https://wa.me/${phoneDigits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export interface UcgLocation {
  name: string;
  reviewUrl: string;
  /** Real Microsoft Bookings link for a pre-buy inspection appointment at
   * this location, e.g. https://outlook.office.com/book/PreBuyInspection@usedcarguys.net/.
   * Only Ramstein/KMC's has been provided so far — the rest are `undefined`
   * on purpose rather than guessed at, since a wrong booking link is worse
   * than none. */
  bookingUrl?: string;
}

/**
 * Real per-location Google Business links, not placeholders — UCG turns out
 * to have a SEPARATE Google listing per lot (confirmed by finding the
 * embedded Google Maps iframe for each city on usedcarguys.net/locations/
 * and reading its CID out of the embed URL), not one shared listing. An
 * earlier version of this file had a single hardcoded review link found via
 * a plus.google.com URL in the site footer — that turned out to be a stale,
 * unrelated legacy identifier that didn't match ANY of these real listings
 * once actually checked against them, so picking a location matters.
 *
 * These link to each location's Maps page rather than Google's direct
 * "write a review" compose page (search.google.com/local/writereview) —
 * that endpoint returned inconsistent results in testing (worked or 400'd
 * depending on request headers, in ways that didn't clearly track with
 * whether the CID itself was valid), which isn't something to trust for a
 * flow meant to actually collect real customer reviews. The Maps link is
 * one extra tap (find Reviews, then "Write a review") but was reliable
 * across every test. Worth using an official link instead if UCG's
 * marketing team already has "g.page" short links for these.
 */
export const ucgLocations: UcgLocation[] = [
  {
    name: 'Ramstein',
    reviewUrl: 'https://www.google.com/maps?cid=8526847724461781786',
    bookingUrl: 'https://outlook.office.com/book/PreBuyInspection@usedcarguys.net/?ismsaljsauthenabled',
  },
  { name: 'Kaiserslautern', reviewUrl: 'https://www.google.com/maps?cid=10345390024072882796' },
  { name: 'Stuttgart', reviewUrl: 'https://www.google.com/maps?cid=11332413732306729190' },
  { name: 'Spangdahlem', reviewUrl: 'https://www.google.com/maps?cid=2225439998252218189' },
  { name: 'Grafenwoehr', reviewUrl: 'https://www.google.com/maps?cid=7083751166661309883' },
  { name: 'Wiesbaden', reviewUrl: 'https://www.google.com/maps?cid=8310605518686449360' },
];

/** Base names, in the same order as constants/bases.ts (the one list). */
export const usareurBases: string[] = BASES.map((b) => b.name);
