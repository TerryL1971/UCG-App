import type { DealIntake, FinancingTerms } from '@/constants/mock-data';
import { HOLD_AMOUNT, formatApoAddress, wireInstructions } from '@/constants/mock-data';
import type { InventoryDetail } from '@/lib/ucg-inventory';

/**
 * Generates the two real documents UCG's own process produces at "sign the
 * paperwork" (see docs/purchase-paperwork.md and end-to-end-flow.md Phase
 * 7) — a **Cost Estimate** for a never-USAREUR-registered `DEN*****` car,
 * or a **Purchase Order** for everything else — filled in from the
 * customer's actual deal data (car, intake, financing, PPP).
 *
 * Field set, labels, the Terms and Conditions text, and the footer block
 * below are copied from six real documents DealerTeam itself produced and
 * printed (Terry, 2026-09-21) — Cost Estimate, Purchase Order, Abgang/
 * Release Info, Warranty Certificate, and Vehicle Hand-Over Document, for
 * two real deals. "Matches exactly" here means the SUBSTANCE — every
 * field DealerTeam fills in, the verbatim legal text, the real customs/
 * VAT identifiers — not a pixel-for-pixel clone of DealerTeam's own plain
 * grid layout; this keeps the app's existing brand-matched visual style.
 * Real customer names/VINs/addresses from those samples are NOT
 * reproduced anywhere here — only the structure and fixed company-level
 * facts (below) that repeated identically across every sample regardless
 * of customer.
 *
 * These are honest SAMPLE documents, not the legally binding paperwork —
 * every generated PDF still says so on its face, same spirit as the
 * "Sandbox mode" note on the deposit screen. The real, signed originals
 * are still produced by UCG (see the `GAP` labels in end-to-end-flow.md's
 * Phase 7) — this exists so a customer has something concrete and
 * *accurate* to look at, print, and walk through with their salesperson.
 */

const GERMAN_VAT_RATE = 0.19;

export function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface DealPricing {
  vehiclePrice: number;
  /** $999 2-Year Premium Protection Plan, only when accepted. */
  pppAmount: number;
  subtotal: number;
  vatAmount: number;
  totalWithVat: number;
  holdAmount: number;
  balanceAfterHold: number;
}

export function computeDealPricing(car: InventoryDetail | null, hasPpp: boolean): DealPricing {
  const vehiclePrice = car?.price ?? 0;
  const pppAmount = hasPpp ? 999 : 0;
  const subtotal = vehiclePrice + pppAmount;
  const vatAmount = Math.round(subtotal * GERMAN_VAT_RATE * 100) / 100;
  const holdAmount = Number(HOLD_AMOUNT);
  return {
    vehiclePrice,
    pppAmount,
    subtotal,
    vatAmount,
    totalWithVat: subtotal + vatAmount,
    holdAmount,
    balanceAfterHold: subtotal - holdAmount,
  };
}

function todayShort(): string {
  return new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

/** Warranty Information, as its own labeled field — real DealerTeam docs
 * show this on every document regardless of whether PPP was purchased
 * (a car with no PPP still shows "12 Months," the base warranty every
 * car comes with — see warranty.tsx: "1-year comprehensive warranty...
 * included as standard"). Not tied to the price table below; that only
 * ever shows PPP as a line item when it was actually bought. */
function warrantyLine(hasPpp: boolean): string {
  return hasPpp ? 'Premium Protection Plan (24 Month Warranty)' : '12-Month Comprehensive Warranty (standard)';
}

function buyerLines(intake: DealIntake | null): string {
  if (!intake) return 'Buyer details are added on the Start Your Deal screen.';
  const lines = [intake.fullName || '—', intake.contact ? `WhatsApp: ${intake.contact}` : '', intake.base ? `Base: ${intake.base}` : ''];
  if (intake.apoAddressStatus === 'have' && intake.apoAddress) {
    lines.push(formatApoAddress(intake.apoAddress));
  }
  return lines.filter(Boolean).join('<br/>');
}

/** Year/Make/Model on a real DealerTeam document are three separate
 * fields (e.g. "Opel" / "Corsa Electric Elegance") — the live inventory
 * scraper (ucg-inventory.ts) only gives us a single combined `title`
 * ("Ford Escape SEL"), not Make and Model split apart. Guessing a split
 * from free text is exactly the kind of thing that's confidently wrong
 * often enough not to do — usedcarguys.net doesn't publish them
 * separately, so this stays one combined line rather than fabricating a
 * Make/Model split with no real source. */
function vehicleLines(car: InventoryDetail | null, hasPpp: boolean): string {
  if (!car) return 'No car selected yet.';
  const bits = [
    'Used',
    `${car.year} ${car.title}`,
    car.exteriorColor ? `Color: ${car.exteriorColor}` : '',
    `Stock #: ${car.stockNumber}`,
    car.vin ? `VIN: ${car.vin}` : '',
    car.mileage ? `Odometer: ${car.mileage.toLocaleString()}` : '',
    car.engine ? `Engine: ${car.engine}` : '',
    `Warranty: ${warrantyLine(hasPpp)}`,
  ];
  return bits.filter(Boolean).join('<br/>');
}

function docStyleBlock(): string {
  return `
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #20263F; padding: 28px; }
    h2 { color: #273368; margin-bottom: 2px; }
    h3 { color: #C33531; margin-top: 22px; }
    .meta { font-size: 12.5px; color: #555; line-height: 1.5; }
    .grid { display: flex; gap: 32px; margin-top: 14px; }
    .col { flex: 1; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: #6B7280; margin-bottom: 4px; }
    .box { font-size: 13.5px; line-height: 1.5; }
    table.totals { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 14px; }
    table.totals td { padding: 6px 0; border-bottom: 1px solid #E7E7EE; }
    table.totals td:last-child { text-align: right; font-weight: 600; }
    tr.total td { font-weight: 700; font-size: 16px; border-bottom: none; border-top: 2px solid #273368; padding-top: 10px; }
    .financeLine { font-size: 13px; margin-top: 8px; color: #20263F; }
    ol { font-size: 13px; line-height: 1.6; padding-left: 18px; }
    .terms { margin-top: 22px; }
    .terms ol { font-size: 10.5px; line-height: 1.55; color: #444; }
    .disclaimer { margin-top: 20px; font-size: 11px; color: #9AA0B4; line-height: 1.5; border-top: 1px solid #E7E7EE; padding-top: 10px; }
    .sig { margin-top: 34px; display: flex; gap: 40px; }
    .sig-line { flex: 1; border-top: 1px solid #20263F; padding-top: 4px; font-size: 11px; color: #6B7280; }
    .footer-legal { margin-top: 22px; font-size: 10px; color: #9AA0B4; line-height: 1.5; }
  `;
}

function docHeader(docTitle: string, subtitle: string, dealMetaRows: [string, string][]): string {
  const { adminOffice } = wireInstructions;
  const metaHtml = dealMetaRows
    .map(([label, value]) => `<tr><td style="color:#6B7280;padding:2px 8px 2px 0;">${label}</td><td style="font-weight:600;">${value || '—'}</td></tr>`)
    .join('');
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <h2>The Used Car Guys</h2>
        <div class="meta">
          ${adminOffice.address}<br/>
          ${adminOffice.phone} · ${adminOffice.email}
        </div>
      </div>
      <table style="font-size:12.5px;"><tbody>${metaHtml}</tbody></table>
    </div>
    <h3>${docTitle}</h3>
    <div class="meta">${subtitle}</div>
  `;
}

function partiesGrid(car: InventoryDetail | null, intake: DealIntake | null, hasPpp: boolean): string {
  return `
    <div class="grid">
      <div class="col">
        <div class="label">Purchaser</div>
        <div class="box">${buyerLines(intake)}</div>
      </div>
      <div class="col">
        <div class="label">Vehicle</div>
        <div class="box">${vehicleLines(car, hasPpp)}</div>
      </div>
    </div>
  `;
}

/**
 * Verbatim from the real Purchase Order / Cost Estimate DealerTeam
 * prints (Terry, 2026-09-21) — this is the actual legal text a customer
 * signs, not a paraphrase, so it's reproduced exactly, including item
 * 4's "Purchase acknowledges" (not "Purchaser") — that's how it reads
 * on the real document. Appears on both Cost Estimate and Purchase
 * Order in reality; the app's Cost Estimate previously had a different
 * (non-legal, "here's what this number means") numbered list instead of
 * this — that walkthrough list is kept separately, below this one.
 */
function termsAndConditionsHtml(): string {
  const items = [
    'Purchaser acknowledges he/she has read the entire purchase order and agrees to its terms.',
    'Purchaser acknowledges that this vehicle must be paid in full within seven calendar days of the initial reservation or it will be released for sale and the reservation canceled and refunded.',
    'Purchaser acknowledges having a full understanding of our warranty.',
    'Purchase acknowledges USAREUR inspection is guaranteed. Any defects which cause the vehicle not to pass inspection will be corrected by the dealer.',
    "Vehicle may be supplied with seasonal tires or US Spec all-season tires. It is the driver's responsibility to ensure that the tires meet the standards for driving conditions.",
    'Purchaser authorizes the Seller to process finance application and obtain all appropriate credit reports or information which will be kept in strict confidence and shall be used in conjunction with this motor vehicle purchase only, if applicable.',
    'Purchaser acknowledges that this vehicle is pre-owned and may have been previously used as a fleet, rental, lease, demo or privately operated vehicle.',
    'Purchaser acknowledges the case of a vehicle being paid in full and then the sale being canceled by the customer, UCG reserves the right to impose a 10% cancellation fee.',
  ];
  return `
    <div class="terms">
      <div class="label">Terms and Conditions</div>
      <ol>${items.map((t) => `<li>${t}</li>`).join('')}</ol>
    </div>
  `;
}

/**
 * The customs/tax identification block every real DealerTeam document
 * carries in its footer — identical across every sample Terry provided
 * regardless of customer or deal, so treated as a fixed company-level
 * fact rather than something derived per-deal. Real values, not
 * placeholders — the actual Zollager (bonded customs warehouse)
 * reference, EORI number, VAT ID, and both Geschäftsführer (managing
 * directors) UCG's real documents already print on everything.
 */
function companyLegalFooterHtml(): string {
  return `
    <div class="footer-legal">
      Zollager: DE/CWP/9300LC000003 &nbsp;SSN: &nbsp;EORI: DE530306934761723<br/>
      VAT ID DE 28 288 7501 &nbsp;Geschäftsführer David Sweeney and James Sweeney
    </div>
  `;
}

function sampleDisclaimer(): string {
  return `
    <div class="disclaimer">
      This is a sample document generated from your deal information for your convenience — it is not the
      binding contract. UCG prepares and signs the official paperwork with you in person or by mail; bring or
      request the original before relying on any figure here.
    </div>
  `;
}

function purchaserSignatureBlock(): string {
  return `
    <div class="sig">
      <div class="sig-line">Purchaser's Signature &amp; Date</div>
      <div class="sig-line">Sales Consultant's Signature &amp; Date</div>
    </div>
    <div class="sig" style="max-width: 48%;">
      <div class="sig-line">Co-Purchaser's Signature &amp; Date</div>
    </div>
  `;
}

/** Path A (DEN*****, never USAREUR-registered) — "Cost Estimate → VAT Form."
 * See docs/purchase-paperwork.md's Path A. */
export function buildCostEstimateHtml(
  car: InventoryDetail | null,
  intake: DealIntake | null,
  hasPpp: boolean,
): string {
  const p = computeDealPricing(car, hasPpp);
  return `
    <html>
      <head><meta charset="utf-8" /><style>${docStyleBlock()}</style></head>
      <body>
        ${docHeader('Cost Estimate', 'EU-spec vehicle · never USAREUR-registered (VAT Form path)', [
          ['Deal #', '(assigned by UCG)'],
          ['Stock #', car?.stockNumber ?? '—'],
          ['Estimated Delivery Date', ''],
          ['Number Of Keys', ''],
          ['Date', todayShort()],
        ])}
        ${partiesGrid(car, intake, hasPpp)}

        <table class="totals">
          <tr><td>Vehicle Price</td><td>${money(p.vehiclePrice)}</td></tr>
          ${p.pppAmount ? `<tr><td>2-Year Premium Protection Plan</td><td>${money(p.pppAmount)}</td></tr>` : ''}
          <tr><td>Amount Due Upon Delivery</td><td>(${money(p.subtotal)})</td></tr>
          <tr><td>Total Price</td><td>${money(p.subtotal)}</td></tr>
          <tr><td>MWST 19%</td><td>${money(p.vatAmount)}</td></tr>
          <tr class="total"><td>Total Amount</td><td>${money(p.totalWithVat)}</td></tr>
        </table>
        <p style="font-size:11px;color:#9AA0B4;">All prices quoted are valid for 30 days.</p>

        <h3>What this number is for</h3>
        <ol>
          <li>Take 3–5 copies of this Cost Estimate to Service Federal Credit Union or Community Bank for an
            Official Cashier's Check in the amount above.</li>
          <li>Take the Cashier's Check and this Cost Estimate to the VAT Office for a Super VAT Form.</li>
          <li>Bring the VAT Form, any other paperwork from the VAT Office, the Cashier's Check, and this Cost
            Estimate back to us — we stamp the VAT Form and get a release from admin.</li>
          <li>We get the TÜV done and ready your registration paperwork for the VRO.</li>
        </ol>
        <p style="font-size:13px;">
          Once your VAT Form is stamped, the VAT is credited back — your net price returns to
          <b>${money(p.subtotal)}</b>. Your reservation fee (${money(p.holdAmount)}) is separate and refundable —
          it is not applied against this total.
        </p>

        ${termsAndConditionsHtml()}
        ${sampleDisclaimer()}
        ${companyLegalFooterHtml()}
      </body>
    </html>
  `;
}

/** Path B (DE*****, previously USAREUR-registered or US-spec) — Purchase
 * Order / Kaufvertrag finalizing price, ahead of a real deposit. Real
 * DealerTeam output titles this "Purchase Order / Kaufvertrag" — one
 * document, not two — matching that here rather than the app's own
 * separate "Bill of Sale" (src/app/deal-paperwork.tsx still generates
 * that as its own PDF; whether that should still exist as a separate
 * document, or whether "5 signed copies" just means 5 copies of THIS
 * one, is worth confirming — out of scope for this pass). */
export function buildPurchaseOrderHtml(
  car: InventoryDetail | null,
  intake: DealIntake | null,
  financingTerms: FinancingTerms | null,
  hasPpp: boolean,
): string {
  const p = computeDealPricing(car, hasPpp);
  const isFinanced = intake?.paymentMethod === 'financing';
  const financeCompanyLine = isFinanced
    ? financingTerms
      ? `Finance Company: ${financingTerms.lender} &nbsp;&nbsp; Amount Financed: ${money(financingTerms.amountFinanced)}`
      : `Finance Company: ${intake?.financingLenders?.length ? intake.financingLenders.join(', ') : 'Pending bank approval'} &nbsp;&nbsp; Amount Financed: pending approval`
    : `Finance Company: Cash - No Lien &nbsp;&nbsp; Amount Financed: ${money(0)}`;

  return `
    <html>
      <head><meta charset="utf-8" /><style>${docStyleBlock()}</style></head>
      <body>
        ${docHeader('Purchase Order / Kaufvertrag', 'Previously USAREUR-registered or US-spec vehicle', [
          ['Deal #', '(assigned by UCG)'],
          ['Stock #', car?.stockNumber ?? '—'],
          ['Estimated Delivery Date', ''],
          ['Number Of Keys', ''],
          ['Deal Date', todayShort()],
        ])}
        ${partiesGrid(car, intake, hasPpp)}

        <table class="totals">
          <tr><td>Total Price (AE550/VAT Form)</td><td>${money(p.subtotal)}</td></tr>
          <tr><td>Down Payment</td><td>(${money(p.holdAmount)})</td></tr>
          <tr class="total"><td>Amount Due Upon Delivery</td><td>${money(p.balanceAfterHold)}</td></tr>
        </table>
        <p class="financeLine">${financeCompanyLine}</p>

        <h3>What happens next</h3>
        <ol>
          <li>Once the balance is paid, UCG prints signed copies of this Purchase Order / Kaufvertrag.</li>
          <li>Take copies to the base Customs Office for 3–5 copies of AE Form 550-175A.</li>
          <li>UCG takes the 550-175As to the German Zollamt to be stamped — after your funds are wired.</li>
          <li>Stamped copies: 2 stay with the Zollamt, 3 come back (dealership, VRO, you).</li>
        </ol>

        ${termsAndConditionsHtml()}
        ${purchaserSignatureBlock()}
        ${sampleDisclaimer()}
        ${companyLegalFooterHtml()}
      </body>
    </html>
  `;
}

/** The Kaufvertrag/Rechnung itself — signed 5x for a `DE*****` deal.
 * NOTE (2026-09-21): the real DealerTeam documents Terry provided don't
 * show a document separate from "Purchase Order / Kaufvertrag" for this
 * — the Purchase Order title literally includes "/ Kaufvertrag" already.
 * Left as its own generator/screen card for now since removing/merging
 * it is a bigger call than the field-accuracy pass this shipped with —
 * flagged for Terry to confirm rather than assumed. */
export function buildBillOfSaleHtml(car: InventoryDetail | null, intake: DealIntake | null, hasPpp: boolean): string {
  const p = computeDealPricing(car, hasPpp);
  const { adminOffice } = wireInstructions;
  return `
    <html>
      <head><meta charset="utf-8" /><style>${docStyleBlock()}</style></head>
      <body>
        ${docHeader('Bill of Sale', 'Kaufvertrag / Rechnung — print 5 signed copies', [
          ['Deal #', '(assigned by UCG)'],
          ['Stock #', car?.stockNumber ?? '—'],
          ['Date', todayShort()],
        ])}
        ${partiesGrid(car, intake, hasPpp)}

        <table class="totals">
          <tr><td>Sale Price</td><td>${money(p.subtotal)}</td></tr>
        </table>

        <p style="font-size:13px;">
          Seller: The Used Car Guys, ${adminOffice.address}. Sold as described above, subject to the passed TÜV
          safety inspection UCG provides and any lien release on file.
        </p>

        <div class="sig">
          <div class="sig-line">Buyer signature &amp; date</div>
          <div class="sig-line">Seller signature &amp; date</div>
        </div>

        ${sampleDisclaimer()}
        ${companyLegalFooterHtml()}
      </body>
    </html>
  `;
}

/**
 * The SELL side — UCG buying a car FROM a customer (Sell It Back, curb
 * purchases). Roles are reversed from every document above: UCG is the
 * Purchaser, the customer is the Seller. Field set, the real 10-clause
 * Terms and Conditions, and the footer are copied from a real DealerTeam
 * "Bill of Sale / Kaufvertrag" (Terry, 2026-09-21) — a genuinely
 * different document from the buy-side one above, not a relabeled copy
 * (different terms entirely: condition/disclosure, deregistration,
 * missing-title retention, cleanliness/fuel deductions — none of which
 * apply when UCG is the one selling).
 *
 * Sell It Back has no year/make/model/color/engine data for a car it
 * didn't sell — only whatever the customer typed (plate/VIN, mileage,
 * condition) plus, if this happens to be a car they originally bought
 * from UCG, whatever `useDeal()` still has cached. Fields with no real
 * source are left out rather than guessed at, same rule as every other
 * generator in this file.
 */
export interface SellBackDealInput {
  car: InventoryDetail | null;
  plateOrVin: string;
  mileage: string;
  mileageUnit: 'mi' | 'km';
  condition: string;
  sellerName: string;
  sellerContact: string;
  acceptedAmount: number;
  hasLien: boolean;
  lienHolder?: string;
  lienAccountNumber?: string;
  payoffAmount?: number;
  payoffDate?: string;
}

function sellBackVehicleLines(input: SellBackDealInput): string {
  const { car, plateOrVin, mileage, mileageUnit } = input;
  const bits = [
    'Used',
    car ? `${car.year} ${car.title}` : '',
    car?.exteriorColor ? `Color: ${car.exteriorColor}` : '',
    `Plate / VIN: ${plateOrVin || '—'}`,
    car?.vin && car.vin !== plateOrVin ? `VIN on file: ${car.vin}` : '',
    mileage ? `Odometer: ${mileage} ${mileageUnit}` : '',
    car?.engine ? `Engine: ${car.engine}` : '',
    `Condition: ${input.condition}`,
  ];
  return bits.filter(Boolean).join('<br/>');
}

/**
 * Verbatim from the real sell-side Bill of Sale (Terry, 2026-09-21) —
 * entirely different legal text from the buy-side Terms and Conditions;
 * this is what protects UCG when it's the one buying, not selling.
 */
function sellBackTermsAndConditionsHtml(): string {
  const items: [string, string][] = [
    [
      'Vehicle Condition and Disclosure',
      'The seller (I/We) confirms that all information provided to The Used Car Guys GmbH ("UCG") regarding the vehicle is complete and accurate and that the vehicle is free from any accidents, damage, defects or other material issues other than those previously disclosed to UCG in writing. Where the vehicle has been involved in an accident, the seller must provide UCG with all available documentation relating to the accident, including any insurance documentation, damage assessments and invoices or other evidence of repair work completed. If, within fourteen (14) days of handover, UCG discovers accident damage, defects or other material issues which existed prior to handover and were not previously disclosed in writing, UCG reserves the right to cancel the purchase. In such circumstances, UCG will return the vehicle to the seller and the seller will repay to UCG any purchase price or other amount already paid by UCG in connection with the purchase. Where UCG has made payment directly to a lienholder, the seller agrees to cooperate fully with UCG and the lienholder to reverse or otherwise resolve the transaction.',
    ],
    [
      'Payment and Deregistration',
      'The seller is responsible for deregistering the vehicle and providing UCG with satisfactory evidence of deregistration. Unless otherwise agreed in writing, any payment due to the seller will be made within thirty (30) days from the date of deregistration shown on the evidence provided to UCG, provided that UCG has received the vehicle, all required keys, documents and information necessary to complete the transaction. Where the vehicle is subject to finance or a lien, the seller must provide, or authorise the lienholder to provide, a valid 30-day payoff amount, a copy of the title or Certificate of Origin where applicable, and all necessary account information. The outstanding payoff amount must not exceed the agreed purchase price less any applicable holdback, retained funds or deductions. If the outstanding payoff amount exceeds this amount, the seller agrees to reduce the outstanding balance to the required amount before UCG is required to complete the purchase.',
    ],
    [
      'Title and Transfer Documents',
      'The seller is responsible for providing all title and ownership documents applicable to the vehicle and required to complete the transfer to UCG. Depending on the vehicle and its registration or finance status, these may include the applicable transfer title document, original Certificate of Title or Certificate of Origin, and original lien release. Where any required document is held by a lienholder, the seller agrees to cooperate with UCG in obtaining it.',
    ],
    [
      'Missing Original Title or Lien Release',
      'If a required original title and/or original lien release cannot be provided at the point of handover, UCG will retain a minimum of $1,000 from the purchase price, or the full amount of positive equity due to the seller where this is greater than $1,000. The retained amount will remain withheld until UCG has received and verified the required original title and/or original lien release. Once the required original documents have been received and verified by UCG, the retained amount will be released to the seller.',
    ],
    [
      'Lienholder Authorisation – Payoff Information',
      'By signing this Bill of Sale, the seller authorises their lienholder to provide UCG with a valid 30-day payoff amount and a copy of the title or Certificate of Origin for the vehicle, where applicable, and authorises the relevant documents and information to be sent directly to UCG.',
    ],
    [
      'Lienholder Authorisation – Original Documents',
      "By signing this Bill of Sale, the seller authorises their lienholder to provide UCG with the original Certificate of Title or original Certificate of Origin for the vehicle, as applicable, together with a notarised lien release confirming that the lien has been satisfied.",
    ],
    [
      'Vehicle Cleanliness at Handover',
      'The vehicle must be handed over in a reasonably clean condition. If the vehicle is handed over in a condition requiring significantly more cleaning than would normally be expected, including but not limited to excessive dirt, stains, rubbish, pet hair or strong odours, UCG reserves the right to deduct a fixed cleaning charge of $300 from the agreed purchase price.',
    ],
    [
      'Fuel Level / State of Charge at Handover',
      'The vehicle must be handed over with a minimum of one-third of a tank of fuel. Electric vehicles must be handed over with a minimum 33% state of charge. If the vehicle is handed over below the applicable minimum, UCG reserves the right to deduct a fixed charge of $100 from the agreed purchase price.',
    ],
    [
      'Vehicle Condition Between Appraisal and Handover',
      "The vehicle must be handed over in substantially the same condition as when it was inspected and/or appraised by UCG, allowing for reasonable additional mileage and normal wear. Any new accident damage, body damage, mechanical or electrical fault, warning light, missing equipment or other material change in the condition of the vehicle occurring between appraisal and handover must be disclosed to UCG before handover. Where there has been a material change in the vehicle's condition, UCG reserves the right to reassess the agreed purchase price or withdraw from the purchase before completion.",
    ],
    [
      'Keys and Vehicle Equipment',
      'The seller must provide all keys, remote controls and other vehicle equipment that were present or declared at the time the vehicle was appraised. If any declared key, remote control or material item of vehicle equipment is missing at handover, UCG reserves the right to deduct the reasonable replacement cost from the agreed purchase price.',
    ],
  ];
  return `
    <div class="terms">
      <div class="label">Terms and Conditions</div>
      <ol>${items.map(([heading, body]) => `<li><b>${heading}.</b> ${body}</li>`).join('')}</ol>
    </div>
  `;
}

function sellerSignatureBlock(): string {
  return `
    <div class="sig">
      <div class="sig-line">Seller's Signature &amp; Date</div>
      <div class="sig-line">Sales Consultant's Signature &amp; Date</div>
    </div>
    <div class="sig" style="max-width: 48%;">
      <div class="sig-line">Co-Seller's Signature &amp; Date</div>
    </div>
  `;
}

export function buildSellBackBillOfSaleHtml(input: SellBackDealInput): string {
  const { adminOffice } = wireInstructions;
  const payoff = input.hasLien ? (input.payoffAmount ?? 0) : 0;
  const tradeEquity = input.acceptedAmount - payoff;

  return `
    <html>
      <head><meta charset="utf-8" /><style>${docStyleBlock()}</style></head>
      <body>
        ${docHeader('Bill of Sale / Kaufvertrag', 'UCG purchasing this vehicle from you', [
          ['Deal #', '(assigned by UCG)'],
          ['Purchase Date', todayShort()],
        ])}

        <div class="grid">
          <div class="col">
            <div class="label">Purchaser</div>
            <div class="box">The Used Car Guys GmbH<br/>${adminOffice.address}</div>
          </div>
          <div class="col">
            <div class="label">Seller</div>
            <div class="box">${input.sellerName || '—'}${input.sellerContact ? `<br/>WhatsApp: ${input.sellerContact}` : ''}</div>
          </div>
        </div>

        <div class="grid" style="margin-top: 6px;">
          <div class="col">
            <div class="label">Vehicle</div>
            <div class="box">${sellBackVehicleLines(input)}</div>
          </div>
        </div>

        <table class="totals">
          <tr><td>Total Vehicle Price (AE550)</td><td>${money(input.acceptedAmount)}</td></tr>
          <tr>
            <td>Lien Holder</td>
            <td>${input.hasLien ? input.lienHolder || 'On file' : 'No Lien'}</td>
          </tr>
          ${
            input.hasLien
              ? `<tr><td>Account Number</td><td>${input.lienAccountNumber || '—'}</td></tr>
                 <tr><td>Payoff Date</td><td>${input.payoffDate || '—'}</td></tr>`
              : ''
          }
          <tr><td>Trade Pay Off</td><td>${money(payoff)}</td></tr>
          <tr class="total"><td>Trade Equity</td><td>${money(tradeEquity)}</td></tr>
        </table>

        ${sellBackTermsAndConditionsHtml()}
        ${sellerSignatureBlock()}
        ${sampleDisclaimer()}
        ${companyLegalFooterHtml()}
      </body>
    </html>
  `;
}
