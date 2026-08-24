/**
 * Placeholder data standing in for the future Salesforce Dealer Team API
 * (salesperson assignment) and the deal-progress steps/documents, which
 * will eventually come from whatever system tracks financing status.
 * Inventory itself is no longer mocked here — see src/lib/ucg-inventory.ts,
 * which reads live listings off usedcarguys.net.
 */

export interface Salesperson {
  id: string;
  name: string;
  title: string;
  topRated: boolean;
  phone: string;
}

export const salesperson: Salesperson = {
  id: 'marcus-whitfield',
  name: 'Marcus Whitfield',
  title: 'Used Car Guys Specialist',
  topRated: true,
  phone: 'tel:+491700000000',
};

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

export interface DealStep {
  id: string;
  title: string;
  status: DealStepStatus;
  detail?: string;
}

// Advanced further along than a brand-new deal on purpose — this is what
// lets the "Car Ready" photo and "Picked Up" camera step (both keyed off
// a step's own status, not hardcoded to a step id) actually show up by
// default instead of requiring someone to hand-edit this file to see them.
export const dealSteps: DealStep[] = [
  { id: 'matched', title: 'Matched with Salesperson', status: 'done', detail: 'Completed · Aug 12' },
  { id: 'application', title: 'Application Submitted', status: 'done', detail: 'Completed · Aug 14' },
  { id: 'documents', title: 'Documents Uploaded', status: 'done', detail: 'Completed · Aug 16' },
  { id: 'financing', title: 'Financing Approved', status: 'done', detail: 'Completed · Aug 19' },
  { id: 'contract', title: 'Contract Signed', status: 'done', detail: 'Completed · Aug 21' },
  { id: 'ready', title: 'Car Ready', status: 'done', detail: 'Completed · Aug 22' },
  { id: 'pickup', title: 'Picked Up', status: 'current' },
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
