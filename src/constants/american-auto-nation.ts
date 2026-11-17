/**
 * American Auto Nation — UCG's own car insurance, for USAREUR drivers and
 * expats. The owners want this pushed: it was founded by the UCG owner's
 * late brother, and keeping it alive matters a great deal to the family
 * (Terry, 2026-09-04).
 *
 * Offer and taglines are from UCG's own flyers.
 *
 * NOTE: there's a founder's-story angle (AAN was started by John, brother
 * to UCG's owners David and James, who passed away a few years ago) —
 * Terry pulled it from the screen on 2026-09-04 ("scrap it for now"). The
 * drafted copy is preserved in the project memory if the owners want it
 * back; deliberately not in this file.
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

} as const;
