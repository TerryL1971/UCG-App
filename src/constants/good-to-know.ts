/**
 * "Good to Know" — the questions customers ask every salesperson, over
 * and over, answered once (Terry, 2026-11-18). Taken from Terry's own
 * WhatsApp answers to a real customer, so they're in UCG's voice. Edit
 * freely; keep answers short and true for every base.
 */
export interface GoodToKnow {
  q: string;
  a: string;
}

export const GOOD_TO_KNOW: GoodToKnow[] = [
  {
    q: 'Are your prices in dollars? Do I pay German taxes?',
    a: 'All prices on our website are in US dollars, and there are no taxes added to them.',
  },
  {
    q: 'Do I pay in dollars or euros?',
    a: 'Everything is in US dollars: deposits and wire transfers. We can tell you the price in euros, but you pay in dollars. The Currency Converter in Tools shows today’s rate.',
  },
  {
    q: 'Can I reserve a car before I arrive?',
    a: 'Yes. On our website, open the car and tap “Reserve this car” under the pictures. A $300 deposit holds it for 5 days; if we’re not on a deal by then, the hold can be released. So if you arrive in two weeks, wait until a few days before you land.',
  },
  {
    q: 'What if I change my mind about the car?',
    a: 'Deposits are refundable, and they can be moved to a different car.',
  },
  {
    q: 'Does UCG do financing?',
    a: 'No, we don’t finance cars ourselves. Service Federal Credit Union and Community Bank both lend for cars here, or use your own bank. Once your loan is approved, your bank wires the money straight to UCG.',
  },
  {
    q: 'The car I like is at another UCG location. Can it come to mine?',
    a: 'Yes, at no charge. Once you’re committed to the car, your salesperson asks our logistics team to schedule the transfer with a driver or our truck. Ask your salesperson about timing.',
  },
  {
    q: 'When can I come in?',
    a: 'Message your salesperson to agree a time. Showroom hours are under “Your UCG team” on My Deal once you’ve picked your dealership.',
  },
  {
    q: 'Do I need an appointment to register the car?',
    a: 'Most Vehicle Registration Offices take online appointments and walk-ins. Your base’s details are on the VRO Checklist in Tools.',
  },
  {
    q: 'What do I need for my registration packet?',
    a: 'Your USAREUR driver’s license (the temporary one works too). Your salesperson puts the packet together.',
  },
  {
    q: 'What if the car needs a repair before I get it?',
    a: 'It goes to one of our partner shops first. Your salesperson tells you as soon as it’s finished and ready to pick up.',
  },
  {
    q: 'Tip: keep your WhatsApp messages',
    a: 'If your chat with UCG has disappearing messages on, your wish list and our answers vanish after a day or two. Turn it off in the chat settings, or keep your wish list here in the app.',
  },
];
