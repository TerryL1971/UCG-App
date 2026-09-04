import type { DealIntake, FinancingTerms } from '@/constants/mock-data';
import { HOLD_AMOUNT, formatApoAddress, wireInstructions } from '@/constants/mock-data';
import type { InventoryDetail } from '@/lib/ucg-inventory';

/**
 * Generates the two real documents UCG's own process produces at "sign the
 * paperwork" (see docs/purchase-paperwork.md and end-to-end-flow.md Phase
 * 7) — a **Cost Estimate** for a never-USAREUR-registered `DEN*****` car,
 * or a **Purchase Order** + **Bill of Sale** for everything else — filled
 * in from the customer's actual deal data (car, intake, financing, PPP).
 *
 * These are honest SAMPLE documents, not the legally binding paperwork —
 * every generated PDF says so on its face, same spirit as the "Sandbox
 * mode" note on the deposit screen. The real, signed originals are still
 * produced by UCG (see the `GAP` labels in end-to-end-flow.md's Phase 7) —
 * this exists so a customer has something concrete to look at, print, and
 * walk through with their salesperson instead of nothing.
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

function todayLong(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function buyerLines(intake: DealIntake | null): string {
  if (!intake) return 'Buyer details are added on the Start Your Deal screen.';
  const lines = [intake.fullName || '—', intake.contact ? `WhatsApp: ${intake.contact}` : '', intake.base ? `Base: ${intake.base}` : ''];
  if (intake.apoAddressStatus === 'have' && intake.apoAddress) {
    lines.push(formatApoAddress(intake.apoAddress));
  }
  return lines.filter(Boolean).join('<br/>');
}

function vehicleLines(car: InventoryDetail | null): string {
  if (!car) return 'No car selected yet.';
  const bits = [
    `${car.year} ${car.title}`,
    `Stock #: ${car.stockNumber}`,
    car.vin ? `VIN: ${car.vin}` : '',
    car.mileage ? `Mileage: ${car.mileage.toLocaleString()} mi` : '',
    car.exteriorColor ? `Color: ${car.exteriorColor}` : '',
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
    ol { font-size: 13px; line-height: 1.6; padding-left: 18px; }
    .disclaimer { margin-top: 26px; font-size: 11px; color: #9AA0B4; line-height: 1.5; border-top: 1px solid #E7E7EE; padding-top: 10px; }
    .sig { margin-top: 40px; display: flex; gap: 40px; }
    .sig-line { flex: 1; border-top: 1px solid #20263F; padding-top: 4px; font-size: 11px; color: #6B7280; }
  `;
}

function docHeader(docTitle: string, subtitle: string): string {
  const { adminOffice } = wireInstructions;
  return `
    <h2>The Used Car Guys</h2>
    <div class="meta">
      ${adminOffice.address}<br/>
      ${adminOffice.phone} · ${adminOffice.email}
    </div>
    <h3>${docTitle}</h3>
    <div class="meta">${subtitle} · Generated ${todayLong()}</div>
  `;
}

function partiesGrid(car: InventoryDetail | null, intake: DealIntake | null): string {
  return `
    <div class="grid">
      <div class="col">
        <div class="label">Buyer</div>
        <div class="box">${buyerLines(intake)}</div>
      </div>
      <div class="col">
        <div class="label">Vehicle</div>
        <div class="box">${vehicleLines(car)}</div>
      </div>
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
        ${docHeader('Cost Estimate', 'EU-spec vehicle · never USAREUR-registered (VAT Form path)')}
        ${partiesGrid(car, intake)}

        <table class="totals">
          <tr><td>Vehicle Price</td><td>${money(p.vehiclePrice)}</td></tr>
          ${p.pppAmount ? `<tr><td>2-Year Premium Protection Plan</td><td>${money(p.pppAmount)}</td></tr>` : ''}
          <tr><td>Subtotal</td><td>${money(p.subtotal)}</td></tr>
          <tr><td>German VAT (19%)</td><td>${money(p.vatAmount)}</td></tr>
          <tr class="total"><td>Cashier's Check Amount</td><td>${money(p.totalWithVat)}</td></tr>
        </table>

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

        ${sampleDisclaimer()}
      </body>
    </html>
  `;
}

/** Path B (DE*****, previously USAREUR-registered or US-spec) — Purchase
 * Order finalizing price, ahead of a real deposit. */
export function buildPurchaseOrderHtml(
  car: InventoryDetail | null,
  intake: DealIntake | null,
  financingTerms: FinancingTerms | null,
  hasPpp: boolean,
): string {
  const p = computeDealPricing(car, hasPpp);
  const paymentLine =
    intake?.paymentMethod === 'financing'
      ? financingTerms
        ? `Financed through ${financingTerms.lender} — ${money(financingTerms.monthlyPayment)}/mo, ${financingTerms.apr}% APR, ${financingTerms.termMonths} mo.`
        : `Financing${intake?.financingLenders?.length ? ` through ${intake.financingLenders.join(', ')}` : ''} — pending bank approval.`
      : 'Paid by wire transfer (see Wire Instructions).';

  return `
    <html>
      <head><meta charset="utf-8" /><style>${docStyleBlock()}</style></head>
      <body>
        ${docHeader('Purchase Order', 'Previously USAREUR-registered or US-spec vehicle')}
        ${partiesGrid(car, intake)}

        <table class="totals">
          <tr><td>Vehicle Price</td><td>${money(p.vehiclePrice)}</td></tr>
          ${p.pppAmount ? `<tr><td>2-Year Premium Protection Plan</td><td>${money(p.pppAmount)}</td></tr>` : ''}
          <tr><td>Subtotal</td><td>${money(p.subtotal)}</td></tr>
          <tr><td>Less: Deposit Paid</td><td>-${money(p.holdAmount)}</td></tr>
          <tr class="total"><td>Balance Due</td><td>${money(p.balanceAfterHold)}</td></tr>
        </table>
        <p style="font-size:13px;">${paymentLine}</p>

        <h3>What happens next</h3>
        <ol>
          <li>Once the balance is paid, UCG prints 5 signed copies of the Bill of Sale.</li>
          <li>Take the 5 copies to the base Customs Office for 3–5 copies of AE Form 550-175A.</li>
          <li>UCG takes the 550-175As to the German Zollamt to be stamped — after your funds are wired.</li>
          <li>Stamped copies: 2 stay with the Zollamt, 3 come back (dealership, VRO, you).</li>
        </ol>

        ${sampleDisclaimer()}
      </body>
    </html>
  `;
}

/** The Kaufvertrag/Rechnung itself — signed 5x for a `DE*****` deal. */
export function buildBillOfSaleHtml(car: InventoryDetail | null, intake: DealIntake | null, hasPpp: boolean): string {
  const p = computeDealPricing(car, hasPpp);
  const { adminOffice } = wireInstructions;
  return `
    <html>
      <head><meta charset="utf-8" /><style>${docStyleBlock()}</style></head>
      <body>
        ${docHeader('Bill of Sale', 'Kaufvertrag / Rechnung — print 5 signed copies')}
        ${partiesGrid(car, intake)}

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
      </body>
    </html>
  `;
}
