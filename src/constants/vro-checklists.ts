/**
 * What a customer needs at the Vehicle Registration Office (VRO) to
 * register the car, get USAREUR plates, and get the environmental sticker.
 *
 * Every USAREUR VRO works from the same regulation (AE 190-1), so one
 * baseline checklist covers the substance everywhere. The exact wording,
 * the office location, and small local quirks differ per garrison — the
 * screen says so and tells the customer their salesperson will confirm the
 * list for their base.
 *
 * Transcribed from the official USAG Stuttgart VRO PDFs (2026-09-04) —
 * full verbatim source in docs/vro-checklists.md. Do not paraphrase the
 * regulatory content loosely; this is the reference.
 */

export type VehicleSpec = 'us' | 'eu';

export interface VroItem {
  label: string;
  detail?: string;
  /** When set, this line links to another screen (e.g. the insurance
   * line points customers at American Auto Nation). */
  link?: '/insurance';
}

export interface VroChecklist {
  /** Things UCG produces or handles before the customer ever goes in. */
  ucgProvides: VroItem[];
  /** Things the customer has to bring themselves. */
  youBring: VroItem[];
  /** Constraints worth planning around, not a document list. */
  warnings: string[];
}

const SHARED_WARNINGS = [
  'The sponsor has to be at the VRO in person — even if someone else is on the bill of sale. A command-sponsored spouse can go with a power of attorney from the sponsor.',
  'Whoever holds the insurance policy is listed as an owner of the vehicle and also has to be at the VRO.',
  'USAA and Mirascon send digital insurance cards — contact them at least 24 hours before your appointment. Other insurers give you a Deckungskarte (double white card).',
  'On Title 10 orders? Bring your orders to every VRO transaction.',
  'You can’t register a car while any of your existing registrations are out of compliance.',
];

const SHARED_YOU_BRING: VroItem[] = [
  { label: 'Orders', detail: 'PCS orders (active duty or civilian), or a 1172 (contractor).' },
  { label: 'DoD ID card' },
  {
    label: 'USAREUR-AF Certificate of License',
    detail: 'You need a USAREUR license to register a car — take the exam online before you land if you don’t have one yet.',
  },
  { label: 'SOFA card', detail: 'Contractors and their dependents only — ID and SOFA card dates must match the 1172.' },
  {
    label: 'Proof of Insurance for Germany',
    detail:
      'An eVB / Blank ICC / Deckungskarte from a German-market policy. American Auto Nation — UCG’s own insurance, built for USAREUR drivers — can set this up, and your first month’s premium is reimbursed.',
    link: '/insurance',
  },
  { label: 'POV limit waiver (AE Form 190-1AG)', detail: 'Only if you’re over the vehicle limit — approved by your commander (O-3 / GS equivalent or above).' },
];

export const vroBaseline: Record<VehicleSpec, VroChecklist> = {
  us: {
    ucgProvides: [
      {
        label: 'Bill of Sale',
        detail: 'An official Kaufvertrag or Rechnung that meets German tax law — a handwritten bill of sale is not accepted for a dealer purchase.',
      },
      { label: 'US Customs Form 550-175A' },
      {
        label: 'Vehicle title',
        detail: 'The USAREUR-AF Transfer Title, or the original US title if the car was imported and not yet registered (a copy is accepted only if the car is financed).',
      },
      { label: 'A passed safety inspection (TÜV)', detail: 'Required to register any used car — UCG pays for it.' },
      { label: 'Lien release', detail: 'If UCG holds one on the car.' },
    ],
    youBring: [
      ...SHARED_YOU_BRING,
      { label: '$45 registration fee', detail: 'Card, check, or money order.' },
    ],
    warnings: SHARED_WARNINGS,
  },
  eu: {
    ucgProvides: [
      {
        label: 'Bill of Sale',
        detail: 'An official Kaufvertrag or Rechnung listing make, model, year, and VIN. If no VAT form is used it shows the tax treatment (taxes outside the sale price, or § 25a UStG).',
      },
      {
        label: 'VAT form',
        detail:
          'For a never-USAREUR-registered car (DEN stock number): UCG gives you a Cost Estimate; you take 3–5 copies to the VAT Office and to Service Federal Credit Union or Community Bank for an official cashier’s check; the VAT Office issues the form; UCG stamps it. Your salesperson walks you through this.',
      },
      { label: 'German title book (Fahrzeugbrief) and registration (Fahrzeugschein)' },
      {
        label: 'Official proof of deregistration',
        detail: 'An MFR on letterhead, signed and stamped — or the USAREUR-AF Transfer Title if the car was last registered in the USAREUR-AF system. Emails and handwritten notes are not accepted.',
      },
      { label: 'A passed safety inspection (TÜV)', detail: 'Required to register any used car — UCG pays for it.' },
      { label: 'Lien release', detail: 'If UCG holds one on the car.' },
    ],
    youBring: [
      ...SHARED_YOU_BRING,
      {
        label: 'Registration fee',
        detail: '$45 per year of registration — up to 2 years for a used car with an inspection less than 30 days old. Card, check, or money order.',
      },
      {
        label: 'German-bank lienholder authorization',
        detail: 'Only if you financed through a German bank — written authorization that the car will be registered in the USAREUR-AF system.',
      },
    ],
    warnings: SHARED_WARNINGS,
  },
};

export interface VroOffice {
  /** Loosely matched against the base the customer entered at intake. */
  base: string;
  name: string;
  address: string;
  hours?: string;
  /** The garrison's own VRO page — the authoritative source for contact
   * details and the current per-scenario checklists. */
  infoUrl?: string;
}

/**
 * Only Stuttgart is filled in — its checklist is the one that's been
 * transcribed. The other communities' VROs run on the same regulation;
 * their office details come from their own garrison pages, which we
 * haven't pulled yet, so the screen falls back to "your salesperson will
 * confirm the office and any local quirks for your base."
 */
export const vroOffices: VroOffice[] = [
  {
    base: 'Stuttgart',
    name: 'USAG Stuttgart Vehicle Registration Office',
    address: 'Building 2930, Panzer Kaserne',
    hours: 'Mon–Fri, 7:45 a.m.–noon and 1:00–3:30 p.m. Closed the last workday of each month and US federal holidays.',
    infoUrl: 'https://home.army.mil/stuttgart/my-garrison/all-services/vehicle-registration',
  },
];

export function vroOfficeForBase(base: string | undefined | null): VroOffice | null {
  if (!base) return null;
  const b = base.toLowerCase();
  return vroOffices.find((o) => b.includes(o.base.toLowerCase())) ?? null;
}

/** A "DEN" prefix means an EU-spec car that has **never been registered
 * on the USAREUR-AF system** (see docs/purchase-paperwork.md). These are
 * the cars that go through the Cost Estimate → VAT Form process, and the
 * hold payment on them can't legally be a "deposit" — it's a refundable
 * reservation fee. A plain "DE" prefix is a car that was USAREUR-
 * registered (or is US-spec), and a normal deposit is fine. */
export function isDenStock(stockNumber: string | undefined | null): boolean {
  return !!stockNumber && /^den/i.test(stockNumber);
}

/** Best guess at US-spec vs EU-spec from the stock number: `DEN` → EU-spec
 * (never USAREUR-registered). Anything else defaults to US-spec. The VRO
 * screen lets the customer flip it — the salesperson knows for sure. */
export function guessVehicleSpec(stockNumber: string | undefined | null): VehicleSpec {
  return isDenStock(stockNumber) ? 'eu' : 'us';
}
