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

/**
 * The AI assistant in the chat. NOT a person, NOT a salesperson — it's the
 * guide that walks the customer through buying or selling, start to finish
 * (Terry, Sept 3: "The AI is the salesperson helping the customer through
 * the process"). A real human is assigned separately, by management, once
 * a deposit is in — see `DealServerState.salesperson` in src/lib/deal-sync.
 */
export interface Assistant {
  name: string;
  title: string;
}

export const ucgAssistant: Assistant = {
  name: 'UCG Assistant',
  title: 'Used Car Guys · AI Guide',
};

/**
 * The real, human salesperson management assigns to handle logistics once
 * a deposit is placed. One hardcoded example person today — `MockDealSync`
 * hands this back only *after* the `deposit-paid` signal (before that,
 * `DealServerState.salesperson` is null and the customer is with the AI
 * assistant). The name/photo become real when a DealerTeam integration
 * returns the actually-assigned "Salesperson 1" — see
 * docs/salesforce-dealerteam-integration-plan.md.
 */
export const salesperson: Salesperson = {
  id: 'assigned-specialist',
  name: 'Your UCG Specialist',
  title: 'Delivery & Logistics',
  topRated: true,
  phone: 'tel:+491700000000',
  whatsapp: '491700000000',
};

/**
 * The "I'm stuck and can't move forward" escape hatch from the AI chat —
 * a last resort, not a primary path (Terry, Sept 3: "worst case
 * scenario"). Should be the WhatsApp number wired into UCG's Trengo inbox
 * so a real agent picks up. PLACEHOLDER: Terry doesn't have the Trengo
 * number yet — this reuses the real support number he already provided
 * for wire transfers (see `wireInstructions.supportWhatsapp` below,
 * 491604440011) as the least-wrong stand-in. Confirm it's Trengo-connected
 * before launch, or swap it.
 */
export const SUPPORT_WHATSAPP = '491604440011';

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
  { id: 'matched', title: 'Started with UCG', status: 'done', detail: 'Completed · Aug 12', waitingOn: 'ucg' },
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
  { id: 'matched', title: 'Started with UCG', status: 'current', waitingOn: 'ucg' },
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
//
// "Orders" (Sept 2, Terry): renamed from "Proof of Income" — this is a
// dealership for US military in Germany, so what's actually needed is
// PCS/deployment orders, not a civilian pay-stub-style income proof.
// Kept the internal `id`/`icon` as 'income' on purpose (touches
// iconFor/statusLabel lookups elsewhere) — only the customer-facing
// `name` changed.
export const dealDocuments: DealDocument[] = [
  { id: 'license', name: "Driver's License", status: 'approved', icon: 'id' },
  { id: 'insurance', name: 'Proof of Insurance', status: 'approved', icon: 'insurance' },
  { id: 'income', name: 'Orders', status: 'approved', icon: 'income' },
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

/**
 * The actual finance application UCG already runs — usedcarguys.net/finance/
 * (verified real, Sept 2: a genuine form collecting personal, military
 * service, and financial details, including SSN/DOB). Deliberately NOT
 * rebuilt inside this app — that form collects sensitive PII this app has
 * no secure backend to receive yet (see docs/legal-considerations-germany.md
 * and docs/backend-and-ai-agent-plan.md's data-handling notes). The app's
 * job here is to point the customer at UCG's own, already-hosted form, not
 * to duplicate it.
 */
export const FINANCE_APPLICATION_URL = 'https://www.usedcarguys.net/finance/';

/**
 * Named lender options for the deal-intake financing preference — real
 * institutions Terry named directly (Sept 2), not invented. "Other" stays
 * free-text. A customer can pick more than one ("or all of the above").
 * A proper lender-lookup/search feature was also asked for but isn't
 * built — see docs/deal-flow-roadmap.md, it needs more specification
 * (search through what directory?) before it's buildable honestly.
 */
export const financingLenderOptions = ['Service Federal Credit Union', 'Community Bank'] as const;

/**
 * Real wire transfer instructions for cash deals, provided directly by
 * Terry (Sept 2) — preserved exactly. Two small spelling fixes only
 * (COMMMERZBANK → COMMERZBANK, "Whats App" → "WhatsApp"), since neither
 * touches an actual routing/account number; every number, code, and IBAN
 * below is copied character-for-character as given, not reformatted or
 * "corrected" — a wrong digit here sends someone's money to the wrong
 * place, so nothing here should ever be edited without going back to the
 * original source.
 */
export const wireInstructions = {
  adminOffice: {
    phone: '06371 92 00 00',
    email: 'online@usedcarguys.net',
    usFax: '(734) 574 6004',
    address: 'The Used Car Guys, Weilerbacher Str 110, 67661, Kaiserslautern',
  },
  supportWhatsapp: '491604440011',
  step1: {
    label: 'STEP 1 — WIRE TRANSFER',
    bank: 'CITIBANK, NEW YORK BRANCH',
    account: '10925832',
    swiftBic: 'CITIUS33',
    abaRouting: '021 000 089',
  },
  step2: {
    label: 'STEP 2 — FURTHER CREDIT TO OUR USD ACCOUNT AT COMMERZBANK',
    bank: 'COMMERZBANK AG MANNHEIM BRANCH',
    iban: 'DE1867 0400 3106 2116 4300',
    swiftBic: 'COBADEFF',
  },
};

/**
 * The warranty upsell — real terms from UCG's own flyers ("1 year vs 2
 * year PPP.pdf", "PPP Flyer - 2 year.pdf", "EPP Flyer 1 year"), preserved
 * exactly, not paraphrased: these are the actual coverage terms a customer
 * sees. See docs/deal-flow-roadmap.md's "Warranty upsell" section.
 *
 * Price is a real number ($999) but nothing here charges it — accepting
 * the plan records the customer's choice for their salesperson to act on
 * (docs say the bank/back-office handles the actual add), same "honest
 * stand-in, no fake transaction" approach as the rest of the app.
 */
export interface WarrantyTier {
  name: string;
  /** Short price line as it appears to the customer. */
  price: string;
  coverage: string;
  deductible: string;
  rentalCar: string;
  maxClaim: string;
  /** Bullet highlights unique to / emphasised for this tier. */
  highlights: string[];
}

export const oneYearWarranty: WarrantyTier = {
  name: '1-Year Comprehensive Warranty',
  price: 'Included in the advertised price',
  coverage: 'Comprehensive — only what is on the warranty list is covered. If it is not listed, it is not covered.',
  deductible: 'On cars over 40,000 miles, a deductible applies to parts. Labour is 100% covered either way.',
  rentalCar: '€60 per day, after the first 4 days',
  maxClaim: '€3,300 over the coverage period',
  highlights: [
    'Engine, transmission, axle/transfer case, steering, brakes',
    'Fuel, electrical, cooling, exhaust and safety systems',
    'Comfort electric — power windows, sunroof, central locking',
    'Rental / towing reimbursement up to €60/day (4 days max)',
  ],
};

export const premiumProtectionPlan: WarrantyTier = {
  name: '2-Year Premium Protection Plan',
  price: '$999 — roughly $16–18/mo on a standard loan (53–60¢/day)',
  coverage:
    'Bumper to bumper — everything in the 1-year plan plus all electronic and mechanical components, excluding wear-and-tear items and fluids.',
  deductible: '$0 deductible on parts AND labour',
  rentalCar: '€60 per day after 4 days, plus priority access to UCG’s small fleet of courtesy cars',
  maxClaim: '€10,000 over the coverage period',
  highlights: [
    'Two years of overseas coverage',
    'Unlimited mileage',
    '$0 deductible, parts and labour',
    'Towing included',
    'Priority access to UCG courtesy cars',
  ],
};

/** 2-year PPP eligibility, straight off the flyer: "the desired vehicle
 * must be newer than 2019 and current odometer reading must be less than
 * 70,000 miles." */
export const PPP_MIN_YEAR = 2019; // "newer than 2019" → year must be > this
export const PPP_MAX_MILES = 70_000;

export type PppEligibility = 'eligible' | 'ineligible' | 'unknown';

/** `unknown` when we don't have the mileage (some scraped listings omit
 * it) — the screen then tells the customer to confirm with their
 * salesperson rather than guessing either way. */
export function pppEligibility(car: { year?: number; mileage?: number } | null): PppEligibility {
  if (!car || typeof car.year !== 'number') return 'unknown';
  if (car.year <= PPP_MIN_YEAR) return 'ineligible';
  if (typeof car.mileage !== 'number') return 'unknown';
  return car.mileage < PPP_MAX_MILES ? 'eligible' : 'ineligible';
}

/** Reasons offered when a customer declines the 2-year plan — UCG wants
 * the "why" captured (docs/deal-flow-roadmap.md): it's what the
 * salesperson sees, and it's what decides whether the American Auto
 * Nation insurance handoff makes sense for this customer. "Other" stays
 * free-text. */
export const warrantyDeclineReasons = [
  'The price',
  'I already have coverage elsewhere',
  "I don't want extended coverage",
  'Not sure yet — want to talk it over first',
] as const;

/**
 * Real decision, confirmed by Terry (Sept 1): a flat $300.00 USD, not a
 * percentage of price. Shared between the deposit screen (deposit.tsx) and
 * the generated paperwork (deal-documents.ts) so both quote the exact same
 * number — this used to live only inside deposit.tsx as a local constant.
 * On a DEN**** car it's presented as a refundable reservation fee instead
 * of a deposit (VAT-Form purchases can't take a deposit) — see
 * `isDenStock` in vro-checklists.ts and docs/purchase-paperwork.md.
 */
export const HOLD_AMOUNT = '300.00';

export type PaymentMethod = 'cash' | 'financing';

export type LicenseStatus = 'have' | 'not_yet';

export type ApoOffice = 'APO' | 'FPO' | 'DPO';

/** AE = Europe/Africa/Middle East/Canada, AA = Americas, AP = Pacific.
 * Almost always AE for this customer base (Germany), but the other two
 * are real and someone routing mail through a different theater could
 * legitimately need them. */
export type ApoRegion = 'AE' | 'AA' | 'AP';

export type ApoAddressStatus = 'have' | 'not_yet';

/** One-line APO/FPO address for display and handoff, e.g.
 * "Jane Doe, CMR 405 Box 1234, APO AE 09056". */
export function formatApoAddress(a: ApoAddress): string {
  return [a.recipient, a.unitBox, `${a.office} ${a.region} ${a.zip}`.trim()].filter(Boolean).join(', ');
}

/**
 * The APO/FPO mailing address a customer will have once they're in
 * Germany. This is the piece the Vehicle Registration Office (VRO) needs
 * to register the car, issue plates, and issue the environmental sticker
 * that nothing else in the deal-intake flow captures — see
 * docs/product-vision.md. It's frequently NOT assigned until the service
 * member in-processes at their gaining unit, which is why the intake form
 * pairs this with an explicit "not assigned yet" state
 * (`DealIntake.apoAddressStatus`) rather than a required field.
 */
export interface ApoAddress {
  /** Name as it appears on the mail — defaults to the buyer, but a family
   * member's mail may route under the sponsor's name. */
  recipient: string;
  /** The military routing line as one string: "PSC 1234 Box 567",
   * "CMR 405 Box 1234", or "Unit 2050 Box 4190". Kept free-text because
   * the prefix (PSC / CMR / Unit) varies by installation and branch and
   * isn't worth constraining into a picker. */
  unitBox: string;
  office: ApoOffice;
  region: ApoRegion;
  zip: string;
}

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
  /** A WhatsApp number specifically (Terry, Sept 2) — UCG's preferred
   * channel for a real call/text, not just "any phone number." Field
   * name kept generic (`contact`, not `whatsapp`) since this is a
   * customer-supplied value, distinct from the app-wide real
   * `salesperson.whatsapp` constant it has nothing to do with. */
  contact: string;
  base: string;
  paymentMethod: PaymentMethod;
  /** One or more selected lenders — "or all of the above" (Terry, Sept 2)
   * means this is a multi-select, not a single choice. Values are either
   * an entry from `financingLenderOptions` or free text from "Other." */
  financingLenders: string[];
  financingDownPayment: string;
  licenseStatus: LicenseStatus;
  /** Both sides, not one photo — a license needs its back read too
   * (class/restrictions, and for a German-issued license, the reverse
   * side carries data the front doesn't). */
  licensePhotoFrontUri: string | null;
  licensePhotoBackUri: string | null;
  /** 'not_yet' when the APO/FPO address hasn't been assigned yet (common
   * before in-processing) — `apoAddress` is null in that case and the
   * customer is expected to come back and add it. */
  apoAddressStatus: ApoAddressStatus;
  apoAddress: ApoAddress | null;
  notes: string;
}
