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

export const dealDocuments: DealDocument[] = [
  { id: 'license', name: "Driver's License", status: 'approved', icon: 'id' },
  { id: 'insurance', name: 'Proof of Insurance', status: 'uploaded', icon: 'insurance' },
  { id: 'income', name: 'Proof of Income', status: 'needed', icon: 'income' },
  { id: 'residence', name: 'Proof of Residence', status: 'needed', icon: 'residence' },
];
