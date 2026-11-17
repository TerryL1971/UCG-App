import { BASE_RULES, BASE_SENSITIVE_STEPS, baseName } from '@/constants/bases';
import type { Deal, DealFile, DealMilestone, DocType, Milestone } from '@/lib/deals';

/**
 * Everything the app *works out* from a deal: which steps are done, what
 * the customer should do next, deadlines, the balance, and which
 * documents belong to the deal. Pure functions only (no React, no
 * network), so the rules live in one place and can be checked directly.
 *
 * The three flows follow what Terry, David and Michelle described in
 * Nov 2026 (see supabase/migrations/20261117120000_deals.sql):
 *   purchase      — non-DEN car: $300 deposit → Retail Ready → wire the
 *                   balance → Paid in Full → AE 550-175A at the base
 *                   customs office → German Zollamt → registration
 *                   packet → VRO → hand-over.
 *   purchase_den  — DEN car (never on the USAREUR system): Cost Estimate
 *                   → cashier's check or loan approval for the Total
 *                   Price → VAT office → paid → TÜV + release →
 *                   registration → hand-over. NEVER mentions a deposit
 *                   or reservation (VAT agreements don't allow either).
 *   sale          — UCG buys the customer's car: Bill of Sale → AE
 *                   550-175B → Zollamt → hand over car, keys and title
 *                   documents → deregister → UCG pays within 30 days.
 */

export type Flow = 'purchase' | 'purchase_den' | 'sale';

export function flowOf(deal: Pick<Deal, 'kind' | 'is_den'>): Flow {
  if (deal.kind === 'sale') return 'sale';
  return deal.is_den ? 'purchase_den' : 'purchase';
}

// ---------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------

export type StepStatus = 'done' | 'current' | 'upcoming';

/** Whose move it is — the point of the timeline is that a customer can
 * see at a glance whether they're the one holding things up. */
export type WaitingOn = 'you' | 'ucg' | 'bank';

export const waitingOnLabel: Record<WaitingOn, string> = {
  you: 'Waiting on You',
  ucg: 'Waiting on UCG',
  bank: 'Waiting on Your Lender',
};

/** Shape the timeline road (components/timeline-road.tsx) draws. */
export interface DealStep {
  id: string;
  title: string;
  status: StepStatus;
  detail?: string;
  waitingOn: WaitingOn;
}

export interface FlowStep extends DealStep {
  /** What happens in this step, in plain words — also the Road to Plates
   * explainer text. */
  explainer: string;
  /** Set when the customer can't act on this step yet, with the reason. */
  lockedReason: string | null;
  /** This base's own instructions for the step (constants/bases.ts), or —
   * while a base's rules haven't been added — a note to confirm locally. */
  baseNote: string | null;
}

interface StepContext {
  deal: Deal;
  milestone: (m: Milestone) => DealMilestone | undefined;
  hasFile: (...types: DocType[]) => boolean;
  balanceText: string;
  totalText: string;
}

interface StepDef {
  id: string;
  title: string;
  waitingOn: (ctx: StepContext) => WaitingOn;
  explainer: (ctx: StepContext) => string;
  isDone: (ctx: StepContext) => boolean;
  lockedReason?: (ctx: StepContext) => string | null;
}

const isFinanced = (ctx: StepContext) => ctx.deal.payment_method === 'finance';

const REGISTRATION_STEP: StepDef = {
  id: 'registration',
  title: 'Registration & Plates',
  waitingOn: (ctx) => (ctx.milestone('registration_packet') ? 'you' : 'ucg'),
  explainer: (ctx) =>
    ctx.milestone('registration_packet')
      ? 'Your registration packet is ready. Take it to the Vehicle Registration Office (VRO) for your Transfer Title Document (TT Doc), plates and environmental sticker, then scan your TT Doc into the app.'
      : 'Once customs is cleared, your salesperson gives you a registration packet with everything the Vehicle Registration Office (VRO) needs. At the VRO you get your Transfer Title Document (TT Doc), plates and environmental sticker.',
  isDone: (ctx) => ctx.hasFile('tt_doc', 'hand_over') || Boolean(ctx.milestone('delivered')),
};

const DELIVERY_STEP: StepDef = {
  id: 'delivered',
  title: 'Pick Up Your Car',
  waitingOn: () => 'you',
  explainer: () =>
    'Bring your new plates, the environmental sticker and your TT Doc to UCG. You sign the Vehicle Hand-Over Document and get your Warranty Certificate, and the car is yours.',
  // The signed Hand-Over Document being scanned IS the delivery — no
  // separate tap needed (Terry, 2026-11-17: keep the salesperson's taps
  // to a minimum).
  isDone: (ctx) => Boolean(ctx.milestone('delivered')) || ctx.hasFile('hand_over'),
};

const PURCHASE_STEPS: StepDef[] = [
  {
    id: 'opened',
    title: 'Deal Opened',
    waitingOn: () => 'ucg',
    explainer: () =>
      'Your salesperson took your $300 deposit and opened your deal. Your signed Purchase Order is your contract, and its scan is in your documents.',
    isDone: () => true,
  },
  {
    id: 'retail_ready',
    title: 'Car Being Prepared',
    waitingOn: () => 'ucg',
    explainer: (ctx) =>
      `UCG gets your car Retail Ready. Your ${ctx.deal.pay_in_full_days}-day window to pay in full starts the moment it is, and you'll see the exact date here.`,
    isDone: (ctx) => Boolean(ctx.milestone('retail_ready')),
  },
  {
    id: 'payment',
    title: 'Pay the Balance',
    waitingOn: (ctx) => (isFinanced(ctx) ? 'bank' : 'you'),
    explainer: (ctx) =>
      isFinanced(ctx)
        ? `Your lender${ctx.deal.lender ? ` (${ctx.deal.lender})` : ''} pays UCG the balance of ${ctx.balanceText} directly. This step completes once UCG has received the funds.`
        : `Wire the balance of ${ctx.balanceText} to UCG using the payment details in this app. This step completes once UCG has received the funds.`,
    isDone: (ctx) => Boolean(ctx.milestone('paid_in_full')),
  },
  {
    id: 'customs_office',
    title: 'Base Customs Office',
    waitingOn: () => 'you',
    explainer: () =>
      'Take your 5 signed Purchase Order copies to the base customs office and ask for 5 copies of AE Form 550-175A. Getting 3 or 4 back is normal. Before you leave the counter, scan one copy, front and back, in the app. Then give all the copies to your salesperson.',
    isDone: (ctx) => ctx.hasFile('ae550a', 'ae550a_stamped') || Boolean(ctx.milestone('customs_cleared')),
    lockedReason: (ctx) =>
      ctx.milestone('paid_in_full')
        ? null
        : "The customs office won't process your AE Form 550-175A until your car is paid in full. This step opens as soon as it is.",
  },
  {
    id: 'zollamt',
    title: 'German Customs (Zollamt)',
    waitingOn: () => 'ucg',
    explainer: () => 'Your salesperson takes your 550-175A copies to the German Zollamt to be cleared.',
    isDone: (ctx) => ctx.hasFile('ae550a_stamped') || Boolean(ctx.milestone('customs_cleared')),
  },
  REGISTRATION_STEP,
  DELIVERY_STEP,
];

const PURCHASE_DEN_STEPS: StepDef[] = [
  {
    id: 'opened',
    title: 'Cost Estimate Ready',
    waitingOn: () => 'ucg',
    explainer: () => 'Your salesperson has printed your Cost Estimate. Its scan is in your documents.',
    isDone: () => true,
  },
  {
    id: 'payment',
    title: "Cashier's Check or Loan",
    waitingOn: () => 'you',
    explainer: (ctx) =>
      `Take your Cost Estimate to your bank. Get a cashier's check for the Total Price of ${ctx.totalText}, payable to The Used Car Guys GmbH. Use the Total Price, not the Total Amount that includes German VAT (MWST). If you're financing, get the approved loan paperwork from your lender instead.`,
    isDone: (ctx) => ctx.hasFile('cashiers_check', 'loan_approval', 'vat_form'),
  },
  {
    id: 'vat_office',
    title: 'VAT Office',
    waitingOn: () => 'you',
    explainer: () =>
      'Take the cashier\'s check (or loan paperwork) and your Cost Estimate to the VAT office on base. The VAT form costs $100. Then bring the VAT forms and the check to your salesperson, who scans them into the app.',
    isDone: (ctx) => ctx.hasFile('vat_form'),
  },
  {
    id: 'paid',
    title: 'Payment Received',
    waitingOn: (ctx) => (ctx.hasFile('loan_approval') ? 'bank' : 'ucg'),
    explainer: () => 'UCG deposits your cashier\'s check, or receives the payment from your lender.',
    isDone: (ctx) => Boolean(ctx.milestone('paid_in_full')),
  },
  {
    id: 'tuv',
    title: 'TÜV & Release',
    waitingOn: () => 'ucg',
    explainer: () => "UCG gets the car's TÜV safety inspection and its release number.",
    isDone: (ctx) => Boolean(ctx.milestone('tuv_release')),
  },
  REGISTRATION_STEP,
  DELIVERY_STEP,
];

const SALE_STEPS: StepDef[] = [
  {
    id: 'opened',
    title: 'Bill of Sale Signed',
    waitingOn: () => 'ucg',
    explainer: (ctx) => `You and your salesperson signed the Bill of Sale for ${ctx.totalText}. Its scan is in your documents.`,
    isDone: () => true,
  },
  {
    id: 'customs_office',
    title: 'Base Customs Office',
    waitingOn: () => 'you',
    explainer: () =>
      'Get AE Form 550-175B at the base customs office. It is valid for 90 days from the date it is issued. Before you leave the counter, scan it, front and back, in the app.',
    isDone: (ctx) => ctx.hasFile('ae550b', 'ae550b_stamped') || Boolean(ctx.milestone('customs_cleared')),
  },
  {
    id: 'zollamt',
    title: 'German Customs (Zollamt)',
    waitingOn: () => 'ucg',
    explainer: () => 'UCG takes the 550-175B to the German Zollamt to be cleared.',
    isDone: (ctx) => ctx.hasFile('ae550b_stamped') || Boolean(ctx.milestone('customs_cleared')),
  },
  {
    id: 'handover',
    title: 'Hand Over Your Car',
    waitingOn: () => 'you',
    explainer: () =>
      'Bring the car (reasonably clean, at least a third of a tank or 33% charge), every key, and your title documents: your TT Doc or title, and the original lien release if the car had a loan. If the original title or lien release is missing, UCG holds back at least $1,000 until it arrives.',
    isDone: (ctx) => Boolean(ctx.milestone('vehicle_received')),
  },
  {
    id: 'deregister',
    title: 'Deregister the Car',
    waitingOn: () => 'you',
    explainer: () => 'Deregister the car at the Vehicle Registration Office, then scan the proof of deregistration into the app.',
    isDone: (ctx) => Boolean(ctx.milestone('deregistered')) || ctx.hasFile('deregistration'),
  },
  {
    id: 'paid_out',
    title: 'You Get Paid',
    waitingOn: () => 'ucg',
    explainer: () =>
      'UCG pays you, or pays off your lender, within 30 days of the deregistration date, once it has the car, all keys and all documents.',
    isDone: (ctx) => Boolean(ctx.milestone('paid_out')),
  },
];

const STEP_DEFS: Record<Flow, StepDef[]> = {
  purchase: PURCHASE_STEPS,
  purchase_den: PURCHASE_DEN_STEPS,
  sale: SALE_STEPS,
};

function contextFor(deal: Deal, milestones: DealMilestone[], files: DealFile[]): StepContext {
  const live = files.filter((f) => !f.replaced_at);
  return {
    deal,
    milestone: (m) => milestones.find((x) => x.milestone === m),
    hasFile: (...types) => live.some((f) => types.includes(f.doc_type)),
    balanceText: formatMoney(balanceDue(deal)),
    totalText: formatMoney(Number(deal.total_price)),
  };
}

function baseNoteFor(flow: Flow, stepId: string, baseId: string | null | undefined): string | null {
  const rule = baseId ? BASE_RULES[baseId]?.stepNotes?.[flow]?.[stepId] : undefined;
  if (rule) return rule;
  if (!BASE_SENSITIVE_STEPS.includes(stepId)) return null;
  const name = baseName(baseId);
  return name
    ? `Every base has its own rules for this step. Your salesperson confirms exactly how it works at ${name}.`
    : 'Every base has its own rules for this step. Set your base in Account so your roadmap matches it.';
}

/**
 * The steps for a deal with live statuses. Progress is monotonic: the
 * furthest step that's done counts every step before it as done too
 * (a stamped 550 can only exist if the car was paid for), so the road
 * never shows a gap.
 *
 * `baseId` is the customer's CURRENT base — a car bought in Wiesbaden and
 * sold after a move to Stuttgart follows Stuttgart's rules for the sale.
 */
export function computeSteps(
  deal: Deal,
  milestones: DealMilestone[],
  files: DealFile[],
  baseId?: string | null,
): FlowStep[] {
  const ctx = contextFor(deal, milestones, files);
  const flow = flowOf(deal);
  const defs = STEP_DEFS[flow];
  let lastDone = -1;
  defs.forEach((def, i) => {
    if (def.isDone(ctx)) lastDone = i;
  });
  return defs.map((def, i) => {
    const status: StepStatus = i <= lastDone ? 'done' : i === lastDone + 1 ? 'current' : 'upcoming';
    return {
      id: def.id,
      title: def.title,
      status,
      waitingOn: def.waitingOn(ctx),
      explainer: def.explainer(ctx),
      lockedReason: status === 'done' ? null : (def.lockedReason?.(ctx) ?? null),
      baseNote: status === 'done' ? null : baseNoteFor(flow, def.id, baseId),
    };
  });
}

// ---------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------

/** What the customer still has to pay (purchase), or what UCG pays them
 * before any lien payoff (sale). The $300 deposit counts toward a non-DEN
 * price; a DEN deal has no deposit at all. */
export function balanceDue(deal: Pick<Deal, 'kind' | 'is_den' | 'total_price' | 'deposit'>): number {
  const total = Number(deal.total_price) || 0;
  if (deal.kind === 'purchase' && !deal.is_den) return Math.max(0, total - (Number(deal.deposit) || 0));
  return total;
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------
// Dates and deadlines
// ---------------------------------------------------------------------

/** Parses yyyy-mm-dd (or a full ISO timestamp) as a LOCAL calendar date,
 * so a date never shifts by a day across time zones. */
export function parseDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Mon–Fri only. German public holidays aren't counted out — the
 * customer is told to confirm with their salesperson. */
export function addBusinessDays(date: Date, days: number): Date {
  let next = new Date(date);
  let added = 0;
  while (added < days) {
    next = addDays(next, 1);
    const dow = next.getDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return next;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

/** Whole days from `today` to `date` (negative once past). */
export function daysUntil(date: Date, today: Date = new Date()): number {
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export interface DealDeadline {
  id: string;
  title: string;
  date: Date;
  /** Plain-words line for the customer. */
  message: string;
  tone: 'info' | 'warning' | 'overdue';
}

/** The one deadline that matters right now, if any. */
/** When the car was handed over: the Delivered mark's date, or else the
 * day the signed Hand-Over Document was scanned. */
export function deliveredOn(milestones: DealMilestone[], files: DealFile[]): string | null {
  const mark = milestones.find((x) => x.milestone === 'delivered');
  if (mark) return mark.happened_on;
  const handOver = liveFiles(files).find((f) => f.doc_type === 'hand_over');
  return handOver ? toIsoDate(new Date(handOver.created_at)) : null;
}

export function currentDeadline(
  deal: Deal,
  milestones: DealMilestone[],
  today: Date = new Date(),
  files: DealFile[] = [],
): DealDeadline | null {
  const m = (id: Milestone) => milestones.find((x) => x.milestone === id);
  const deliveredDate = deliveredOn(milestones, files);
  const tone = (date: Date): DealDeadline['tone'] => {
    const left = daysUntil(date, today);
    if (left < 0) return 'overdue';
    return left <= 2 ? 'warning' : 'info';
  };
  const flow = flowOf(deal);

  if (flow === 'purchase') {
    if (deliveredDate) {
      const until = addBusinessDays(parseDate(deliveredDate), 5);
      if (daysUntil(until, today) < 0) return null;
      return {
        id: 'inspection_guarantee',
        title: 'Inspection guarantee',
        date: until,
        message: `UCG's guarantee that your car passes inspection ends ${formatDate(until)}, 5 business days after hand-over. Get your inspection done before then.`,
        tone: tone(until),
      };
    }
    const ready = m('retail_ready');
    if (ready && !m('paid_in_full')) {
      const payBy = addDays(parseDate(ready.happened_on), deal.pay_in_full_days);
      return {
        id: 'pay_in_full',
        title: 'Pay in full',
        date: payBy,
        message:
          daysUntil(payBy, today) < 0
            ? `Your payment was due ${formatDate(payBy)}. Contact your salesperson right away.`
            : `Your car is Retail Ready. Please pay the balance of ${formatMoney(balanceDue(deal))} by ${formatDate(payBy)}.`,
        tone: tone(payBy),
      };
    }
    return null;
  }

  if (flow === 'purchase_den') {
    if (deliveredDate) {
      const until = addBusinessDays(parseDate(deliveredDate), 5);
      if (daysUntil(until, today) < 0) return null;
      return {
        id: 'inspection_guarantee',
        title: 'Inspection guarantee',
        date: until,
        message: `UCG's guarantee that your car passes inspection ends ${formatDate(until)}, 5 business days after hand-over.`,
        tone: tone(until),
      };
    }
    if (m('paid_in_full')) return null;
    const validUntil = addDays(parseDate(deal.document_date), 30);
    return {
      id: 'cost_estimate_valid',
      title: 'Cost Estimate valid until',
      date: validUntil,
      message:
        daysUntil(validUntil, today) < 0
          ? `Your Cost Estimate's prices were valid until ${formatDate(validUntil)}. Contact your salesperson for an updated one.`
          : `Your Cost Estimate is valid until ${formatDate(validUntil)}.`,
      tone: tone(validUntil),
    };
  }

  // Sale
  const dereg = m('deregistered');
  if (dereg && !m('paid_out')) {
    const payBy = addDays(parseDate(dereg.happened_on), 30);
    return {
      id: 'sale_payment',
      title: 'UCG pays you by',
      date: payBy,
      message: `UCG pays within 30 days of your deregistration date: by ${formatDate(payBy)}, once it has the car, every key and all documents.`,
      tone: 'info',
    };
  }
  return null;
}

// ---------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------

export interface DocTypeInfo {
  type: DocType;
  label: string;
  /** Who normally scans it. Either side can always upload. */
  scannedBy: 'customer' | 'salesperson';
  /** Prompts for each page of a scan, e.g. ['Front', 'Back']. Null means
   * "as many pages as the document has". */
  pages: string[] | null;
  flows: Flow[];
  /** A paper original that has to stay with the car — what the customer
   * hands over when they sell it later. */
  originalStaysWithCar: boolean;
}

const ALL: Flow[] = ['purchase', 'purchase_den', 'sale'];
const BUYING: Flow[] = ['purchase', 'purchase_den'];
const FRONT_BACK = ['Front', 'Back'];

export const DOC_TYPES: DocTypeInfo[] = [
  { type: 'purchase_order', label: 'Purchase Order (signed)', scannedBy: 'salesperson', pages: null, flows: BUYING, originalStaysWithCar: true },
  { type: 'cost_estimate', label: 'Cost Estimate', scannedBy: 'salesperson', pages: null, flows: ['purchase_den'], originalStaysWithCar: true },
  { type: 'bill_of_sale', label: 'Bill of Sale (signed)', scannedBy: 'salesperson', pages: null, flows: ['sale'], originalStaysWithCar: false },
  { type: 'ae550a', label: 'AE Form 550-175A', scannedBy: 'customer', pages: FRONT_BACK, flows: ['purchase'], originalStaysWithCar: false },
  { type: 'ae550a_stamped', label: 'AE Form 550-175A (stamped)', scannedBy: 'salesperson', pages: FRONT_BACK, flows: ['purchase'], originalStaysWithCar: true },
  { type: 'ae550b', label: 'AE Form 550-175B', scannedBy: 'customer', pages: FRONT_BACK, flows: ['sale'], originalStaysWithCar: false },
  { type: 'ae550b_stamped', label: 'AE Form 550-175B (stamped)', scannedBy: 'salesperson', pages: FRONT_BACK, flows: ['sale'], originalStaysWithCar: false },
  { type: 'cashiers_check', label: "Cashier's Check (copy)", scannedBy: 'salesperson', pages: null, flows: ['purchase_den'], originalStaysWithCar: false },
  { type: 'loan_approval', label: 'Loan Approval', scannedBy: 'salesperson', pages: null, flows: ['purchase_den'], originalStaysWithCar: false },
  { type: 'vat_form', label: 'VAT Forms', scannedBy: 'salesperson', pages: null, flows: ['purchase_den'], originalStaysWithCar: true },
  { type: 'tuv', label: 'TÜV / GTU Inspection Report', scannedBy: 'salesperson', pages: null, flows: BUYING, originalStaysWithCar: true },
  { type: 'tt_doc', label: 'Transfer Title Document (TT Doc)', scannedBy: 'customer', pages: FRONT_BACK, flows: ALL, originalStaysWithCar: true },
  { type: 'warranty_certificate', label: 'Warranty Certificate', scannedBy: 'salesperson', pages: null, flows: BUYING, originalStaysWithCar: true },
  { type: 'hand_over', label: 'Vehicle Hand-Over Document (signed)', scannedBy: 'salesperson', pages: null, flows: BUYING, originalStaysWithCar: true },
  { type: 'title', label: 'Title / Certificate of Origin', scannedBy: 'salesperson', pages: null, flows: ['sale'], originalStaysWithCar: false },
  { type: 'lien_release', label: 'Lien Release', scannedBy: 'salesperson', pages: null, flows: ['sale'], originalStaysWithCar: false },
  { type: 'payoff_letter', label: 'Payoff Letter', scannedBy: 'salesperson', pages: null, flows: ['sale'], originalStaysWithCar: false },
  { type: 'registration_memo', label: 'Registration Memo (MFR)', scannedBy: 'salesperson', pages: null, flows: ['sale'], originalStaysWithCar: false },
  { type: 'deregistration', label: 'Proof of Deregistration', scannedBy: 'customer', pages: null, flows: ['sale'], originalStaysWithCar: false },
  { type: 'license', label: "Driver's License", scannedBy: 'customer', pages: FRONT_BACK, flows: ALL, originalStaysWithCar: false },
  { type: 'other', label: 'Other Document', scannedBy: 'salesperson', pages: null, flows: ALL, originalStaysWithCar: false },
];

export function docTypeInfo(type: DocType): DocTypeInfo {
  return DOC_TYPES.find((d) => d.type === type) ?? DOC_TYPES[DOC_TYPES.length - 1];
}

export function docTypesForFlow(flow: Flow): DocTypeInfo[] {
  return DOC_TYPES.filter((d) => d.flows.includes(flow));
}

/** The document types a customer is asked to scan themselves for this
 * deal (shown as "Scan" buttons). */
export function customerScanTypes(flow: Flow): DocTypeInfo[] {
  return docTypesForFlow(flow).filter((d) => d.scannedBy === 'customer');
}

/** Current (not replaced) files, newest first. */
export function liveFiles(files: DealFile[]): DealFile[] {
  return files.filter((f) => !f.replaced_at).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** The paper originals that belong with a car the customer bought — what
 * they'll need when they sell it, to UCG or anyone else. */
export function originalsChecklist(flow: Flow, files: DealFile[]): { info: DocTypeInfo; inApp: boolean }[] {
  if (flow === 'sale') return [];
  const live = liveFiles(files);
  return docTypesForFlow(flow)
    .filter((d) => d.originalStaysWithCar)
    .map((info) => ({ info, inApp: live.some((f) => f.doc_type === info.type) }));
}

export function vehicleLabel(deal: Pick<Deal, 'vehicle_year' | 'vehicle_make' | 'vehicle_model'>): string {
  const label = [deal.vehicle_year, deal.vehicle_make, deal.vehicle_model].filter(Boolean).join(' ');
  return label || 'Your car';
}

export function dealTitle(deal: Pick<Deal, 'kind' | 'is_den'>): string {
  if (deal.kind === 'sale') return 'Selling to UCG';
  return 'Buying from UCG';
}
