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
          <li>Take 3–5 copies of this Cost Estimate to the VAT Office, and to Service Federal Credit Union or
            Community Bank for an Official Cashier's Check in the amount above.</li>
          <li>The Cashier's Check goes to the VAT Office — that's your payment for the car.</li>
          <li>The VAT Office issues your VAT Form.</li>
          <li>Bring the VAT Form back to UCG — we stamp it and complete the paperwork for the VRO.</li>
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
