import type { WaitingOn } from '@/constants/mock-data';

/**
 * "What happens after I pay" — the customer-facing narrative version of
 * Phases 7-9 in docs/end-to-end-flow.md (paperwork → customs/TÜV/VAT →
 * the VRO → plates), personalized by DEN vs DE stock number the same way
 * /vro-checklist already is (see `isDenStock`/`guessVehicleSpec` in
 * vro-checklists.ts). This is a narrative walk-through, not a tracked
 * status — none of these steps are wired to deal-sync (they're all still
 * `GAP`, done by a person, per end-to-end-flow.md), so there's no
 * "current step" here the way `dealSteps` has one.
 */
export interface RoadStep {
  id: string;
  title: string;
  detail: string;
  waitingOn: WaitingOn;
}

/** Path A — DEN***** (EU-spec, never USAREUR-registered). See
 * docs/purchase-paperwork.md's Path A. */
export const roadToPlatesDen: RoadStep[] = [
  {
    id: 'cashiers-check',
    title: "Cashier's Check to the VAT Office",
    detail:
      "You took your Cost Estimate to the VAT Office and to Service Federal Credit Union or Community Bank for an Official Cashier's Check — that check is your payment for the car.",
    waitingOn: 'you',
  },
  {
    id: 'vat-form',
    title: 'VAT Form issued & stamped',
    detail: 'The VAT Office issues your VAT Form. You bring it back to UCG, who stamps it and completes the packet.',
    waitingOn: 'ucg',
  },
  {
    id: 'tuv',
    title: 'TÜV safety inspection',
    detail: 'Required to register any used car in Germany — UCG pays for it and gets it done.',
    waitingOn: 'ucg',
  },
  {
    id: 'title-dereg',
    title: 'German title & deregistration',
    detail:
      'UCG puts together the German title book (Fahrzeugbrief), registration (Fahrzeugschein), and official proof of deregistration — an MFR on letterhead, or the USAREUR-AF Transfer Title.',
    waitingOn: 'ucg',
  },
  {
    id: 'vro',
    title: 'The VRO',
    detail: 'You bring the full packet in — walk out with your Transfer Title documents, USAREUR plates, and environmental sticker.',
    waitingOn: 'you',
  },
  {
    id: 'gas-card',
    title: 'Esso gas card',
    detail: 'A separate room at the VRO issues your Esso gas card while you’re there.',
    waitingOn: 'you',
  },
];

/** Path B — DE***** (previously USAREUR-registered, or US-spec). See
 * docs/purchase-paperwork.md's Path B. */
export const roadToPlatesDe: RoadStep[] = [
  {
    id: 'funds',
    title: 'Funds wired',
    detail: 'Your balance is wired to UCG. Nothing on the customs side moves until the funds actually arrive.',
    waitingOn: 'bank',
  },
  {
    id: 'customs',
    title: 'Base Customs Office',
    detail: 'You take your 5 signed Bill of Sale copies to the base Customs Office and get 3–5 copies of AE Form 550-175A.',
    waitingOn: 'you',
  },
  {
    id: 'zollamt',
    title: 'Stamped by the German Zollamt',
    detail: 'UCG takes the 550-175As to the German Zollamt to be stamped. 2 copies stay with the Zollamt; 3 come back — one each for the dealership, the VRO, and you.',
    waitingOn: 'ucg',
  },
  {
    id: 'tuv',
    title: 'TÜV safety inspection',
    detail: 'Required to register any used car in Germany — UCG pays for it and gets it done.',
    waitingOn: 'ucg',
  },
  {
    id: 'title',
    title: 'Title paperwork',
    detail: 'For a US-spec car: the USAREUR-AF Transfer Title, or the original US title. For an EU-spec DE car: German title book plus deregistration proof.',
    waitingOn: 'ucg',
  },
  {
    id: 'vro',
    title: 'The VRO',
    detail: 'You bring the full packet in — walk out with your Transfer Title documents, USAREUR plates, and environmental sticker.',
    waitingOn: 'you',
  },
  {
    id: 'gas-card',
    title: 'Esso gas card',
    detail: 'A separate room at the VRO issues your Esso gas card while you’re there.',
    waitingOn: 'you',
  },
];
