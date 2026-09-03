/**
 * American Auto Nation — UCG's own car insurance, for USAREUR drivers and
 * expats. The owners want this pushed: it was founded by the UCG owner's
 * late brother, and keeping it alive matters a great deal to the family
 * (Terry, 2026-09-04).
 *
 * Offer and taglines are from UCG's own flyers. The founder's story:
 * brothers John, David and James. John started American Auto Nation and
 * passed away a few years ago (Terry, 2026-09-04 — exact timing unknown,
 * so no date is stated). UCG's owners are David, James, and David's wife
 * Michelle, and they carry AAN on. Terry should still eyeball the exact
 * wording — it's the family's story.
 *
 * There's no AAN quoting API — "Request a quote" is a WhatsApp handoff to
 * UCG carrying the car + customer context, matching what the flyer says
 * ("Request an instant quote for this vehicle through your sales person").
 */

export const americanAutoNation = {
  name: 'American Auto Nation',
  url: 'https://www.americanautonation.com',
  tagline: 'Tailor-made insurance for USAREUR drivers and expats',
  points: ['Affordable rates', 'Great customer service', 'Peace of mind'],

  /** From the "First Month's Insurance PAID" flyer — preserved. */
  firstMonthOffer: {
    headline: 'First month’s premium — on us',
    body: 'Buy your car from Used Car Guys and insure it with American Auto Nation, and we reimburse your first month’s premium — guaranteed.',
    terms:
      'Valid only with American Auto Nation policies arranged at the time of purchase through Used Car Guys. Reimbursement is limited to the actual first month’s premium charged. One reimbursement per vehicle purchase. Other conditions may apply — ask in store for details.',
  },

  /** Terry to eyeball the exact wording — it's the family's story. */
  story: {
    heading: 'Kept in the family',
    body: 'American Auto Nation was John’s. When he passed, his brothers David and James, and David’s wife Michelle — the family behind Used Car Guys — kept it going. Carrying on what John built means a great deal to them.',
  },
} as const;
