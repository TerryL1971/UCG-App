/**
 * American Auto Nation — UCG's own car insurance, for USAREUR drivers and
 * expats. The owners want this pushed: it was founded by the UCG owner's
 * late brother, and keeping it alive matters a great deal to the family
 * (Terry, 2026-09-04).
 *
 * Offer and taglines are from UCG's own flyers. The founder's story below
 * is a PLACEHOLDER — Terry gave the gist; he needs to confirm the exact
 * wording and whether to name the founder before this ships.
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

  /** PLACEHOLDER — Terry to confirm wording / whether to name the founder. */
  story: {
    heading: 'Part of the family',
    body: 'American Auto Nation was founded by the brother of Used Car Guys’ owner. After he passed, the family carried it on — it’s part of UCG now, and keeping his company alive means a great deal to us.',
  },
} as const;
