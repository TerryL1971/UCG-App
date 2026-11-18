import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';

import { addDays, docTypeInfo, formatMoney, toIsoDate } from '@/lib/deal-flow';
import type {
  Deal,
  DealBundle,
  DealFile,
  DealMilestone,
  DocType,
  Milestone,
  NewDeal,
  SaveDealResult,
} from '@/lib/deals';
import { DEMO_CUSTOMER_ID, DEMO_STAFF_ID, DEMO_STAFF_NAME } from '@/lib/demo-mode';

/**
 * The mock backend behind demo mode (lib/demo-mode.ts): the same
 * operations as the Supabase functions in lib/deals.ts, kept on the phone
 * in AsyncStorage. Made-up people and cars only — never real customer
 * data.
 *
 * Seeded with three deals at different stages, already connected to the
 * "customer", so the app shows something real-looking the moment it opens.
 * Seeded documents have no real file; opening one generates a clearly
 * marked DEMO placeholder PDF on the fly.
 */

interface DemoStore {
  deals: Deal[];
  milestones: DealMilestone[];
  files: DealFile[];
}

const STORAGE_KEY = 'ucg.demoDeals.v4';
const DEMO_PREFIX = 'demo:';

let store: DemoStore | null = null;
let loading: Promise<DemoStore> | null = null;
const listeners = new Set<() => void>();

function id(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function seed(): DemoStore {
  const today = new Date();
  const iso = (offset: number) => toIsoDate(addDays(today, offset));
  const stamp = (offset: number) => addDays(today, offset).toISOString();
  const base = {
    customer_name: 'Taylor Buyer',
    customer_last_name: 'Buyer',
    customer_id: DEMO_CUSTOMER_ID,
    salesperson_id: null,
    salesperson_name: 'Demo Salesperson',
    // No WhatsApp on demo deals: "Message my salesperson" goes to UCG's
    // general WhatsApp instead of a made-up number.
    salesperson_whatsapp: null,
    // Follows the customer's base on screen (dealershipForBase), so a
    // Stuttgart customer sees the Stuttgart team in the demo.
    dealership: null,
    lender: null,
    registration_expires: null,
    ae550b_issued: null,
    pay_in_full_days: 5,
  };
  const deals: Deal[] = [
    {
      ...base,
      id: 'demo-deal-90001',
      kind: 'purchase',
      is_den: false,
      deal_number: '90001',
      stock_number: 'DE9001',
      vehicle_year: 2018,
      vehicle_make: 'Audi',
      vehicle_model: 'Q5 Quattro Premium Plus',
      vehicle_color: 'Blue',
      vin: 'WDEMO0000000AUDI1',
      odometer: 60000,
      total_price: 25499,
      deposit: 300,
      payment_method: 'cash',
      document_date: iso(-5),
      created_at: stamp(-5),
      updated_at: stamp(-2),
    },
    {
      ...base,
      id: 'demo-deal-90002',
      kind: 'purchase',
      is_den: true,
      deal_number: '90002',
      stock_number: 'DEN9002',
      vehicle_year: 2021,
      vehicle_make: 'Opel',
      vehicle_model: 'Corsa Electric Elegance',
      vehicle_color: 'Blue',
      vin: 'WDEMO0000000OPEL2',
      odometer: 9100,
      total_price: 20998,
      deposit: 0,
      payment_method: 'cash',
      document_date: iso(-1),
      // Older than the Audi so the regular purchase (the main flow) opens first.
      created_at: stamp(-6),
      updated_at: stamp(-1),
    },
    {
      ...base,
      id: 'demo-deal-90003',
      kind: 'sale',
      is_den: false,
      deal_number: '90003',
      stock_number: 'DE9003',
      vehicle_year: 2017,
      vehicle_make: 'Jeep',
      vehicle_model: 'Cherokee Latitude',
      vehicle_color: 'Silver',
      vin: 'WDEMO0000000JEEP3',
      odometer: 94370,
      total_price: 5000,
      deposit: 0,
      payment_method: null,
      document_date: iso(-20),
      created_at: stamp(-20),
      updated_at: stamp(-5),
    },
  ];
  const mark = (dealId: string, milestone: Milestone, offset: number): DealMilestone => ({
    deal_id: dealId,
    milestone,
    happened_on: iso(offset),
    marked_at: stamp(offset),
    marked_by: DEMO_STAFF_ID,
    marked_by_name: DEMO_STAFF_NAME,
  });
  const file = (dealId: string, docType: DocType, offset: number, role: 'staff' | 'customer' = 'staff', pages = 1): DealFile => ({
    id: id() + docType,
    deal_id: dealId,
    doc_type: docType,
    storage_path: `${DEMO_PREFIX}${dealId}:${docType}`,
    page_count: pages,
    uploaded_by: role === 'staff' ? DEMO_STAFF_ID : DEMO_CUSTOMER_ID,
    uploaded_by_role: role,
    uploaded_by_name: role === 'staff' ? DEMO_STAFF_NAME : base.customer_name,
    replaced_at: null,
    created_at: stamp(offset),
  });
  return {
    deals,
    milestones: [
      mark('demo-deal-90001', 'retail_ready', -2),
      mark('demo-deal-90003', 'customs_cleared', -12),
      mark('demo-deal-90003', 'vehicle_received', -8),
      mark('demo-deal-90003', 'deregistered', -5),
    ],
    files: [
      file('demo-deal-90001', 'purchase_order', -5, 'staff', 1),
      file('demo-deal-90001', 'license', -4, 'customer', 2),
      file('demo-deal-90002', 'cost_estimate', -1),
      file('demo-deal-90003', 'bill_of_sale', -20, 'staff', 2),
      file('demo-deal-90003', 'ae550b', -14, 'customer', 2),
      file('demo-deal-90003', 'ae550b_stamped', -12, 'staff', 2),
      file('demo-deal-90003', 'title', -8),
      file('demo-deal-90003', 'deregistration', -5, 'customer'),
    ],
  };
}

async function load(): Promise<DemoStore> {
  if (store) return store;
  if (!loading) {
    loading = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => (raw ? (JSON.parse(raw) as DemoStore) : seed()))
      .catch(() => seed())
      .then((s) => {
        store = s;
        return s;
      });
  }
  return loading;
}

function save() {
  if (!store) return;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store)).catch(() => {});
  // Async, like a realtime event from the server.
  setTimeout(() => listeners.forEach((l) => l()), 0);
}

function bundle(s: DemoStore, deal: Deal): DealBundle {
  return {
    deal,
    milestones: s.milestones.filter((m) => m.deal_id === deal.id),
    files: s.files.filter((f) => f.deal_id === deal.id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}


export async function demoFetchMyDeals(): Promise<DealBundle[]> {
  const s = await load();
  return s.deals
    .filter((d) => d.customer_id === DEMO_CUSTOMER_ID)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((d) => bundle(s, d));
}

export async function demoFetchDealBundle(dealId: string): Promise<DealBundle | null> {
  const s = await load();
  const deal = s.deals.find((d) => d.id === dealId);
  return deal ? bundle(s, deal) : null;
}

function clean(input: Partial<NewDeal>): Partial<NewDeal> {
  return {
    ...input,
    ...(input.deal_number !== undefined ? { deal_number: input.deal_number.trim() } : {}),
    ...(input.stock_number !== undefined ? { stock_number: input.stock_number.trim().toUpperCase() } : {}),
    ...(input.vin !== undefined ? { vin: input.vin.trim().toUpperCase() } : {}),
  };
}

export async function demoCreateDeal(input: NewDeal): Promise<SaveDealResult> {
  const s = await load();
  const c = clean(input) as NewDeal;
  const now = new Date().toISOString();
  const deal: Deal = {
    registration_expires: null,
    ae550b_issued: null,
    ...c,
    id: `demo-deal-${id()}`,
    customer_id: DEMO_CUSTOMER_ID,
    salesperson_id: null,
    created_at: now,
    updated_at: now,
  };
  s.deals.push(deal);
  save();
  return { ok: true, deal };
}

export async function demoUpdateDeal(dealId: string, input: Partial<NewDeal>): Promise<SaveDealResult> {
  const s = await load();
  const c = clean(input);
  const deal = s.deals.find((d) => d.id === dealId);
  if (!deal) return { ok: false, reason: 'error', message: 'Deal not found' };
  Object.assign(deal, c, { updated_at: new Date().toISOString() });
  save();
  return { ok: true, deal };
}

export async function demoDeleteDeal(dealId: string): Promise<void> {
  const s = await load();
  s.deals = s.deals.filter((d) => d.id !== dealId);
  s.milestones = s.milestones.filter((m) => m.deal_id !== dealId);
  s.files = s.files.filter((f) => f.deal_id !== dealId);
  save();
}

export async function demoDeleteDealFile(fileId: string): Promise<void> {
  const s = await load();
  const file = s.files.find((f) => f.id === fileId);
  if (!file) return;
  s.files = s.files.filter((f) => f.id !== fileId);
  if (!file.replaced_at && file.doc_type !== 'other') {
    const previous = s.files
      .filter((f) => f.deal_id === file.deal_id && f.doc_type === file.doc_type)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (previous) previous.replaced_at = null;
  }
  save();
}

export async function demoResetSteps(dealId: string): Promise<void> {
  const s = await load();
  s.milestones = s.milestones.filter((m) => m.deal_id !== dealId);
  save();
}

export async function demoSetMilestone(dealId: string, milestone: Milestone, done: boolean, happenedOn?: string) {
  const s = await load();
  s.milestones = s.milestones.filter((m) => !(m.deal_id === dealId && m.milestone === milestone));
  if (done) {
    s.milestones.push({
      deal_id: dealId,
      milestone,
      happened_on: happenedOn ?? toIsoDate(new Date()),
      marked_at: new Date().toISOString(),
      marked_by: DEMO_CUSTOMER_ID,
      marked_by_name: 'You',
    });
  }
  save();
}

export async function demoUploadDealFile(params: {
  dealId: string;
  docType: DocType;
  localPdfUri: string;
  pageCount: number;
  role: 'customer' | 'staff';
}): Promise<DealFile> {
  const s = await load();
  // Keep a durable copy — cache files can be cleared by the OS.
  const dir = `${FileSystem.documentDirectory}demo-deal-files/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const target = `${dir}${params.docType}-${id()}.pdf`;
  await FileSystem.copyAsync({ from: params.localPdfUri, to: target });

  const now = new Date().toISOString();
  if (params.docType !== 'other') {
    s.files.forEach((f) => {
      if (f.deal_id === params.dealId && f.doc_type === params.docType && !f.replaced_at) f.replaced_at = now;
    });
  }
  const deal = s.deals.find((d) => d.id === params.dealId);
  const file: DealFile = {
    id: id(),
    deal_id: params.dealId,
    doc_type: params.docType,
    storage_path: target,
    page_count: params.pageCount,
    uploaded_by: params.role === 'staff' ? DEMO_STAFF_ID : DEMO_CUSTOMER_ID,
    uploaded_by_role: params.role,
    uploaded_by_name: params.role === 'staff' ? DEMO_STAFF_NAME : (deal?.customer_name ?? null),
    replaced_at: null,
    created_at: now,
  };
  s.files.push(file);
  save();
  return file;
}

/** A local file uri for a document — the real copy for anything uploaded
 * in the demo, a generated DEMO placeholder for the seeded ones. */
export async function demoFileUri(storagePath: string): Promise<string> {
  if (!storagePath.startsWith(DEMO_PREFIX)) return storagePath;
  const [dealId, docType] = storagePath.slice(DEMO_PREFIX.length).split(':');
  const s = await load();
  const deal = s.deals.find((d) => d.id === dealId);
  const label = docTypeInfo(docType as DocType).label;
  const rows = deal
    ? [
        ['Deal #', deal.deal_number],
        ['Stock #', deal.stock_number],
        ['Customer', deal.customer_name],
        ['Vehicle', [deal.vehicle_year, deal.vehicle_make, deal.vehicle_model].filter(Boolean).join(' ')],
        ['VIN', deal.vin],
        ['Price', formatMoney(Number(deal.total_price))],
      ]
    : [];
  const html = `<html><body style="font-family: -apple-system, Helvetica, sans-serif; padding: 48px; color: #20263F;">
    <div style="border: 4px dashed #C33531; color: #C33531; font-size: 28px; font-weight: 800; text-align: center; padding: 16px; margin-bottom: 32px;">
      DEMO DOCUMENT — NOT A REAL ${label.toUpperCase()}
    </div>
    <h1 style="font-size: 30px;">${label}</h1>
    <table style="font-size: 18px; border-collapse: collapse;">
      ${rows.map(([k, v]) => `<tr><td style="padding: 6px 24px 6px 0; color: #6B7280;">${k}</td><td style="padding: 6px 0; font-weight: 600;">${v}</td></tr>`).join('')}
    </table>
    <p style="margin-top: 40px; color: #6B7280; font-size: 15px;">In the real app, this is the salesperson's color scan of the signed paper document.</p>
  </body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export function demoSubscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Back to the three seeded deals (Account → Reset Demo Data). */
export async function resetDemoData(): Promise<void> {
  store = seed();
  loading = Promise.resolve(store);
  save();
}
