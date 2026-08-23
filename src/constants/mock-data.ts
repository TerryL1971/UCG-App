/**
 * Placeholder data standing in for the future WordPress inventory API and
 * Salesforce Dealer Team API. Shapes here are a first guess at the real
 * contracts — expect them to move once those integrations are wired up.
 */

export type CarColor = 'navy' | 'red' | 'slate';

export interface Car {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  price: number;
  mileage: number;
  transmission: string;
  drivetrain: string;
  fuel: string;
  exteriorColor: string;
  interiorColor: string;
  engine: string;
  lot: string;
  certified: boolean;
  illustrationColor: CarColor;
}

export const cars: Car[] = [
  {
    id: 'rav4-xle-2021',
    year: 2021,
    make: 'Toyota',
    model: 'RAV4',
    trim: 'XLE',
    price: 24995,
    mileage: 32410,
    transmission: 'Automatic',
    drivetrain: 'AWD',
    fuel: 'Gas',
    exteriorColor: 'Magnetic Gray',
    interiorColor: 'Black Cloth',
    engine: '2.5L 4-Cyl',
    lot: 'Stuttgart Lot',
    certified: true,
    illustrationColor: 'navy',
  },
  {
    id: 'civic-sport-2020',
    year: 2020,
    make: 'Honda',
    model: 'Civic',
    trim: 'Sport',
    price: 18450,
    mileage: 27880,
    transmission: 'Automatic',
    drivetrain: 'FWD',
    fuel: 'Gas',
    exteriorColor: 'Rallye Red',
    interiorColor: 'Black Cloth',
    engine: '1.5L Turbo 4-Cyl',
    lot: 'Stuttgart Lot',
    certified: false,
    illustrationColor: 'red',
  },
  {
    id: 'passat-se-2019',
    year: 2019,
    make: 'Volkswagen',
    model: 'Passat',
    trim: 'SE',
    price: 16900,
    mileage: 41120,
    transmission: 'Automatic',
    drivetrain: 'FWD',
    fuel: 'Gas',
    exteriorColor: 'Pure White',
    interiorColor: 'Titan Black',
    engine: '2.0L Turbo 4-Cyl',
    lot: 'Stuttgart Lot',
    certified: true,
    illustrationColor: 'slate',
  },
];

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

export const dealSteps: DealStep[] = [
  { id: 'matched', title: 'Matched with Salesperson', status: 'done', detail: 'Completed · Aug 12' },
  { id: 'application', title: 'Application Submitted', status: 'done', detail: 'Completed · Aug 14' },
  { id: 'documents', title: 'Documents Uploaded', status: 'current', detail: 'In progress' },
  { id: 'financing', title: 'Financing Approved', status: 'upcoming' },
  { id: 'contract', title: 'Contract Signed', status: 'upcoming' },
  { id: 'ready', title: 'Car Ready', status: 'upcoming' },
  { id: 'pickup', title: 'Picked Up', status: 'upcoming' },
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
