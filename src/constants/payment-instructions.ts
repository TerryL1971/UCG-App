/**
 * UCG's real bank details, copied character-for-character from UCG's own
 * documents (Terry, 2026-11-17). A wrong digit sends someone's money to
 * the wrong place — never edit these without going back to the source.
 *
 * Which account for whom (Terry, 2026-11-17):
 *  - Customers paying cash themselves → the Wise USD account (one-step US
 *    wire or ACH). Source: "UCG WISE account-details 17 July 2026.pdf".
 *    The bank address is the July 2026 one (Community Federal Savings
 *    Bank); the Oct 2023 Wise letter's "Wise US Inc, 30 W 26th St" is
 *    out of date.
 *  - Lenders → the Commerzbank USD account via Citibank NY ("two-step
 *    transfer"). Source: "wire transfer details for UCG dollar account.pdf"
 *    (newest sheet). Lenders already have these; the app only keeps them
 *    for a loan officer who asks. The newest sheet dropped the
 *    "RECIPIENT: THE USED CAR GUYS GMBH" line the May 2025 version had —
 *    kept here because banks normally require a beneficiary name (flagged
 *    to Michelle).
 *
 * Wire fraud: these details are built into the app on purpose. The app
 * never shows bank details that arrive in chat or WhatsApp, and tells
 * customers UCG will never send new ones by message.
 */

export const UCG_LEGAL_NAME = 'The Used Car Guys GmbH';

export const wiseAccount = {
  name: UCG_LEGAL_NAME,
  accountType: 'Checking',
  routingNumber: '026073150',
  accountNumber: '8310619497',
  swiftBic: 'CMFGUS33',
  bankName: 'Community Federal Savings Bank',
  bankAddress: '89-16 Jamaica Ave, Woodhaven, NY, 11421, United States',
} as const;

export const lenderWireInstructions = {
  step1: {
    bank: 'CITIBANK, NEW YORK BRANCH',
    accountNumber: '10925832',
    swiftBic: 'CITIUS33',
    abaRouting: '021 000 089',
  },
  step2: {
    recipient: 'THE USED CAR GUYS GMBH',
    bank: 'COMMERZBANK AG MANNHEIM BRANCH',
    iban: 'DE18 6704 0031 0621 1643 00',
    swiftBic: 'COBADEFF',
  },
} as const;

/** "If you or the bank teller are having any issue or have any questions,
 * please call or WhatsApp our mobile number" — from the wire sheet. */
export const PAYMENT_HELP_PHONE = '+49 160 4440011';

export const ucgAdminOffice = {
  phone: '06371 92 00 00',
  email: 'online@usedcarguys.net',
  address: 'Weilerbacher Str 110, 67661 Kaiserslautern',
} as const;

/** What the customer writes in the transfer's reference/memo line, so
 * Michelle can match the payment. Michelle may prefer another format. */
export function paymentReference(stockNumber: string, dealNumber: string): string {
  return `${stockNumber} Deal ${dealNumber}`;
}
