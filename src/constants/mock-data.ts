/**
 * Placeholder data standing in for the future Salesforce Dealer Team API
 * (salesperson assignment) and the deal-progress steps/documents, which
 * will eventually come from whatever system tracks financing status.
 * Inventory itself is no longer mocked here — see src/lib/ucg-inventory.ts,
 * which reads live listings off usedcarguys.net.
 *
 * `DealIntake` below is the newest addition to this: what the customer
 * tells us on the deal-intake screen (src/app/deal-intake.tsx) before a
 * real deal exists — cash vs. financing, which base they're headed to,
 * USAREUR license status. This is deliberately the *input* a salesperson
 * would type into Dealer Team, not the deal itself; `dealSteps` further
 * down is still the (separately mocked, further-along) deal record.
 */

export interface Salesperson {
  id: string;
  name: string;
  title: string;
  topRated: boolean;
  phone: string;
  /** Digits only, country code, no '+' — the format wa.me links need. */
  whatsapp: string;
}

export const salesperson: Salesperson = {
  id: 'marcus-whitfield',
  name: 'Marcus Whitfield',
  title: 'Used Car Guys Specialist',
  topRated: true,
  phone: 'tel:+491700000000',
  whatsapp: '491700000000',
};

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
  { name: 'Ramstein', reviewUrl: 'https://www.google.com/maps?cid=8526847724461781786' },
  { name: 'Kaiserslautern', reviewUrl: 'https://www.google.com/maps?cid=10345390024072882796' },
  { name: 'Stuttgart', reviewUrl: 'https://www.google.com/maps?cid=11332413732306729190' },
  { name: 'Spangdahlem', reviewUrl: 'https://www.google.com/maps?cid=2225439998252218189' },
  { name: 'Grafenwoehr', reviewUrl: 'https://www.google.com/maps?cid=7083751166661309883' },
  { name: 'Wiesbaden', reviewUrl: 'https://www.google.com/maps?cid=8310605518686449360' },
];

export type DealStepStatus = 'done' | 'current' | 'upcoming';

/** Whose action moves this step forward — the whole point being that a
 * customer can tell at a glance whether they're the one holding things up,
 * or whether it's on UCG or the bank. This is the actual point of the
 * timeline, more than any animation on top of it. */
export type WaitingOn = 'you' | 'ucg' | 'bank';

export const waitingOnLabel: Record<WaitingOn, string> = {
  you: 'Waiting on You',
  ucg: 'Waiting on UCG',
  bank: 'Waiting on the Bank',
};

export interface DealStep {
  id: string;
  title: string;
  status: DealStepStatus;
  detail?: string;
  waitingOn: WaitingOn;
}

// Advanced further along than a brand-new deal on purpose — this is what
// lets the "Car Ready" photo and "Picked Up" camera step (both keyed off
// a step's own status, not hardcoded to a step id) actually show up by
// default instead of requiring someone to hand-edit this file to see them.
export const dealSteps: DealStep[] = [
  { id: 'matched', title: 'Matched with Salesperson', status: 'done', detail: 'Completed · Aug 12', waitingOn: 'ucg' },
  { id: 'application', title: 'Application Submitted', status: 'done', detail: 'Completed · Aug 14', waitingOn: 'you' },
  { id: 'documents', title: 'Documents Uploaded', status: 'done', detail: 'Completed · Aug 16', waitingOn: 'you' },
  { id: 'financing', title: 'Financing Approved', status: 'done', detail: 'Completed · Aug 19', waitingOn: 'bank' },
  { id: 'contract', title: 'Contract Signed', status: 'done', detail: 'Completed · Aug 21', waitingOn: 'you' },
  { id: 'ready', title: 'Car Ready', status: 'done', detail: 'Completed · Aug 22', waitingOn: 'ucg' },
  { id: 'pickup', title: 'Picked Up', status: 'current', waitingOn: 'you' },
];

export type DocumentStatus = 'needed' | 'uploaded' | 'approved';

export interface DealDocument {
  id: string;
  name: string;
  status: DocumentStatus;
  icon: 'id' | 'insurance' | 'income' | 'residence';
}

// All approved — consistent with dealSteps' "documents" step being marked
// done above. (These previously stayed partly "Needed" even once the
// timeline claimed the step was complete, which contradicted itself the
// moment someone actually looked at the document list.)
export const dealDocuments: DealDocument[] = [
  { id: 'license', name: "Driver's License", status: 'approved', icon: 'id' },
  { id: 'insurance', name: 'Proof of Insurance', status: 'approved', icon: 'insurance' },
  { id: 'income', name: 'Proof of Income', status: 'approved', icon: 'income' },
  { id: 'residence', name: 'Proof of Residence', status: 'approved', icon: 'residence' },
];

export interface FinancingTerms {
  amountFinanced: number;
  apr: number;
  termMonths: number;
  monthlyPayment: number;
  lender: string;
}

export const financingTerms: FinancingTerms = {
  amountFinanced: 21500,
  apr: 4.9,
  termMonths: 60,
  monthlyPayment: 405,
  lender: 'USAA Auto Loans',
};

export type PaymentMethod = 'cash' | 'financing';

export type LicenseStatus = 'have' | 'not_yet';

/** Major US military communities in Germany a customer might be headed
 * to — not exhaustive, and a list like this goes stale (units move,
 * bases close), which is exactly why the intake form pairs this with a
 * free-text "Other" option rather than pretending it covers everyone. */
export const usareurBases: string[] = [
  'Ramstein / KMC',
  'Baumholder',
  'Wiesbaden',
  'Spangdahlem',
  'Stuttgart',
  'Grafenwoehr',
  'Vilseck',
  'Ansbach',
  'Illesheim',
  'Hohenfels',
];

/**
 * Two real resources for the USAREUR driving test/license — re-verified
 * 2026-08-31 after Terry reported the practice-test link 404ing on his own
 * phone:
 *  - usareurpracticetest.com (the original pick) is confirmed DEAD as of
 *    this check — every fetch attempt (http and https) got a connection
 *    reset, not just a slow load, matching Terry's 404 report exactly.
 *    It's an old, non-SSL, volunteer-run ASP site; still referenced
 *    around the web as "the" community practice-test site, but not
 *    reliably up. Swapped for the Army's own official page instead:
 *    it demonstrably loads, and links the REAL study manual (not a
 *    third-party quiz), so it's a strictly better default even though
 *    it's not an interactive practice test.
 *  - JKO (jko.jten.mil) hosts the actual official course + exam ("USA 007"
 *    for the course, "USA 007B" for the exam) — this one genuinely
 *    satisfies the requirement, but needs a CAC or JKO account, which not
 *    everyone has yet at this point in the process, so it stays a second
 *    link rather than the primary one. One honest caveat: automated
 *    fetches to this specific host hit a TLS chain-verification error in
 *    testing — possibly nothing (a common false alarm for .mil domains
 *    from tools that lack the DoD root CA), but if anyone reports this
 *    link failing on a real phone too, re-check it the same way the
 *    practice-test link just got caught.
 */
export const USAREUR_STUDY_GUIDE_URL = 'https://home.army.mil/stuttgart/my-garrison/all-services/drivers-testing';
export const USAREUR_OFFICIAL_JKO_URL = 'https://jko.jten.mil/';

/**
 * What the deal-intake screen gathers before a customer ever meets their
 * salesperson — a stand-in for what a salesperson would actually be typing
 * into Dealer Team (Salesforce) to open a real deal. See
 * src/lib/deal-intake-context.tsx for how this is held and handed off.
 */
export interface DealIntake {
  fullName: string;
  contact: string;
  base: string;
  paymentMethod: PaymentMethod;
  financingLender: string;
  financingDownPayment: string;
  licenseStatus: LicenseStatus;
  /** Both sides, not one photo — a license needs its back read too
   * (class/restrictions, and for a German-issued license, the reverse
   * side carries data the front doesn't). */
  licensePhotoFrontUri: string | null;
  licensePhotoBackUri: string | null;
  notes: string;
}
