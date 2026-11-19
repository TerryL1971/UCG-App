/**
 * Words You'll Hear: every Army, customs and German word in the app, in
 * plain English (Terry, 2026-11-19). A customer who has never been to
 * Germany doesn't know what a VRO or a TT Doc is, so each step on My Deal
 * lists the terms it uses with a one-line meaning (components/words-to-know.tsx),
 * and Tools has the full list.
 *
 * Keep meanings short, true for every base, and free of other jargon.
 * DEN rule: never say "deposit" or "reservation" in a DEN entry.
 */
export interface Term {
  term: string;
  meaning: string;
  /** Finds the term in a step's text. */
  match: RegExp;
}

export const GLOSSARY: Term[] = [
  {
    term: 'VRO',
    meaning: 'Vehicle Registration Office. The US Forces office where you register your car and get your plates.',
    match: /\bVRO\b|Vehicle Registration Office/i,
  },
  {
    term: 'Retail Ready',
    meaning: 'UCG has finished getting your car ready for you. Your countdown to pay in full starts then.',
    match: /Retail Ready/i,
  },
  {
    term: 'Base customs office',
    meaning: 'The US Forces office on base that issues the customs forms (the "550") for buying or selling a car.',
    match: /customs office/i,
  },
  {
    term: 'AE Form 550-175A',
    meaning: 'The US Forces customs form for buying a car in Germany tax-free. You get it at the base customs office.',
    match: /550-175A|\b550\b(?!-175B)/,
  },
  {
    term: 'AE Form 550-175B',
    meaning: 'The customs form for selling your car. It is good for 90 days once it is issued.',
    match: /550-175B/,
  },
  {
    term: 'Zollamt',
    meaning: 'The German customs office. UCG takes your forms there for you, so you never have to go.',
    match: /Zollamt|clears? customs|customs (is )?cleared/i,
  },
  {
    term: 'Registration packet',
    meaning: 'The folder of papers your salesperson gives you to take to the VRO.',
    match: /registration packet/i,
  },
  {
    term: 'TT Doc',
    meaning: 'Transfer Title Document. The paper from the VRO that shows the car is registered to you. Keep it safe: you need it to sell the car later.',
    match: /TT Doc|Transfer Title/i,
  },
  {
    term: 'Environmental sticker',
    meaning: 'The green windshield sticker that lets you drive into German cities’ low-emission zones. The VRO gives it to you.',
    match: /environmental sticker/i,
  },
  {
    term: 'USAREUR license',
    meaning: 'Your US Forces driver’s license for Germany. You get it on base after a short class and test, and you need it to register a car.',
    match: /USAREUR (driver|licen)/i,
  },
  {
    term: 'Hand-Over Document',
    meaning: 'The paper you sign when you pick up your car. After that, the car is yours.',
    match: /Hand-Over Document/i,
  },
  {
    term: 'Purchase Order',
    meaning: 'Your contract with UCG for the car. Your salesperson gives you copies.',
    match: /Purchase Order/i,
  },
  {
    term: 'DEN car',
    meaning: 'A car that was never on the US Forces registration system (its stock number starts with DEN). It goes through the base VAT office instead of the customs forms.',
    match: /\bDEN\b|never been on the USAREUR/i,
  },
  {
    term: 'Cost Estimate',
    meaning: 'The paperwork for a DEN car. Your bank and the VAT office use its Total Price.',
    match: /Cost Estimate/i,
  },
  {
    term: 'VAT office',
    meaning: 'The base office that issues the form that takes German sales tax off a DEN car. The form costs $100.',
    match: /VAT office|VAT form/i,
  },
  {
    term: 'MWST',
    meaning: 'German sales tax (VAT). It is printed on the Cost Estimate, but you don’t pay it.',
    match: /MWST/,
  },
  {
    term: 'TÜV',
    meaning: 'Germany’s official safety inspection. UCG gets it done for you.',
    match: /TÜV/,
  },
  {
    term: 'Wire transfer',
    meaning: 'Sending money straight from your bank to UCG’s. The app shows you exactly where to send it.',
    match: /\bwire\b/i,
  },
  {
    term: 'Deregister',
    meaning: 'Cancelling the car’s registration at the VRO and turning in its plates, when you sell it.',
    match: /deregist/i,
  },
  {
    term: 'Lien release',
    meaning: 'The letter from your bank saying your car loan is paid off.',
    match: /lien release/i,
  },
];

/** The glossary terms a piece of text uses, in glossary order. */
export function termsIn(...texts: (string | null | undefined)[]): Term[] {
  const text = texts.filter(Boolean).join(' ');
  return GLOSSARY.filter((t) => t.match.test(text));
}
