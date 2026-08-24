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

// Deep-links straight to UCG's real "write a review" page — this is a real
// business identifier, not a placeholder. The CID (116234595812975768728)
// came from a plus.google.com link in usedcarguys.net's own footer; Google+
// itself is long gone, but the CID is the same one Maps still uses for the
// business today (verified: fetching it resolves a real Place page). Worth
// swapping for an official link if UCG's marketing team already has one.
export const googleReviewUrl = 'https://search.google.com/local/writereview?cid=116234595812975768728';

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
