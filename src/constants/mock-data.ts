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

// FAKE NUMBER — has been since this file's very first version, long before
// the AI agent's "Talk to a Human" fallback made it something a customer
// might actually tap expecting a real person. 491700000000 doesn't reach
// anyone. Needs UCG's real WhatsApp Business number (and to decide whose
// number this actually is, now that "Marcus" himself may not exist as a
// specific real person once assignment is real — see the open question in
// docs/deal-flow-roadmap.md) before this goes anywhere near a real
// customer. Every WhatsApp touchpoint in the app reads from this one
// constant, so fixing it here fixes all of them at once.
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
  /** Real Microsoft Bookings link for a pre-buy inspection appointment at
   * this location, e.g. https://outlook.office.com/book/PreBuyInspection@usedcarguys.net/.
   * Only Ramstein/KMC's has been provided so far — the rest are `undefined`
   * on purpose rather than guessed at, since a wrong booking link is worse
   * than none (see PreBuyInspectionButton in car/[id].tsx). */
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

// What "Reset Test Data" (Account tab) actually resets the timeline to —
// a genuinely fresh deal, not the further-along demo default above. Kept
// as a separate constant rather than mutating `dealSteps` so the default
// on first launch stays exactly as designed (Car Ready/Picked Up visible
// without hand-editing this file), while a reset gives testers what they
// actually expect: steps 1-7 back to a real starting point.
export const freshDealSteps: DealStep[] = [
  { id: 'matched', title: 'Matched with Salesperson', status: 'current', waitingOn: 'ucg' },
  { id: 'application', title: 'Application Submitted', status: 'upcoming', waitingOn: 'you' },
  { id: 'documents', title: 'Documents Uploaded', status: 'upcoming', waitingOn: 'you' },
  { id: 'financing', title: 'Financing Approved', status: 'upcoming', waitingOn: 'bank' },
  { id: 'contract', title: 'Contract Signed', status: 'upcoming', waitingOn: 'you' },
  { id: 'ready', title: 'Car Ready', status: 'upcoming', waitingOn: 'ucg' },
  { id: 'pickup', title: 'Picked Up', status: 'upcoming', waitingOn: 'you' },
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
 * twice on 2026-08-31, first after Terry reported the practice-test link
 * 404ing, then again after Terry independently pasted the full text of
 * the official Army Garrison Stuttgart page while checking the fix:
 *
 *  - usareurpracticetest.com (the original pick) is confirmed DEAD — every
 *    fetch attempt (http and https) got a connection reset, not just a
 *    slow load, matching Terry's 404 report exactly. It's an old, non-SSL,
 *    volunteer-run ASP site; still referenced around the web as "the"
 *    community practice-test site, but not reliably up. Do not resurrect
 *    this URL without re-checking it first.
 *  - JKO (jko.jten.mil), promoted to the PRIMARY link after re-reading the
 *    Army's own page text: it's not gated behind CAC access the way the
 *    first pass here assumed — non-CAC family members can request a free
 *    "sponsored account" using the DoD ID number on their ID card, so this
 *    is realistically reachable by most customers, not just servicemembers
 *    with a CAC. Search course "USA 007", complete it, then take exam
 *    "USA 007B" — the certification is valid 60 days. This is better than
 *    a practice quiz anyway: it's the REAL exam, doable online before a
 *    PCS move, not a proxy for it.
 *  - The Stuttgart garrison page (`USAREUR_STUDY_GUIDE_URL`) is kept as a
 *    secondary "study first" link — it hosts the real drivers manual and
 *    road signs, but Terry independently confirmed (by pasting its full
 *    text back) that it is NOT an interactive practice test, just official
 *    info — don't describe it as one in UI copy.
 *  - Explicitly NOT linked: the Quizlet USAREUR flashcard sets Terry found
 *    while checking this (both quizlet.com/512909008/... and
 *    quizlet.com/de/619589929/...). User-submitted content for a real
 *    government exam, unverifiable for accuracy the way the two links
 *    above are (Quizlet also blocks this app's own fetch tooling with a
 *    403 either way, so neither could be checked even superficially).
 *    Terry flagged the same accuracy concern independently, and it held
 *    up: a separate AI-generated answer Terry later checked also
 *    recommended one of these same sets, with an equally unverifiable
 *    claim ("nearly all the exact questions") — a second unverified
 *    source repeating an unverified claim isn't confirmation of it, so
 *    still not linked.
 *  - Real, reproducible finding while checking a direct JKO login URL
 *    Terry sent (jkodirect.jten.mil/.../Login.jsf): the fetch failed with
 *    "self signed certificate in certificate chain" — the specific
 *    signature of DoD PKI certs not being in a normal device's trust
 *    store, a well-documented, common experience on fresh devices (search
 *    confirmed this, not just this app's tooling). A real customer on
 *    their own phone will very likely see a "connection is not private"
 *    browser warning tapping into JKO — expected and safe to continue
 *    through, but alarming if unexplained, so the app now warns about it
 *    right next to the button rather than let it look like a broken link.
 *  - Also folded in, once corroborated by the official Army Garrison page
 *    Terry pasted (not just the second AI answer that repeated it): the
 *    85%-or-higher passing score, and the arrival-day checklist (printed
 *    certificate, stateside license, DoD ID/CAC, $30 fee, on-site vision
 *    check) — now in the in-app copy too.
 */
export const USAREUR_OFFICIAL_JKO_URL = 'https://jko.jten.mil/';
export const USAREUR_STUDY_GUIDE_URL = 'https://home.army.mil/stuttgart/my-garrison/all-services/drivers-testing';

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
