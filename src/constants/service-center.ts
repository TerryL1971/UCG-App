/**
 * UCG Service Center — real content from usedcarguys.net/service-center/
 * (fetched 2026-09-03). The service department is explicitly NOT limited to
 * customers who bought a car from UCG — "anyone can use the service center"
 * (Terry) — so this is a first-class feature reachable without a deal, not
 * a post-purchase add-on.
 *
 * Booking is via UCG's own hosted request forms (no live API, no Microsoft
 * Bookings here — unlike the Pre-Buy Inspection flow). The app's job is to
 * present the services clearly and hand off to the right form, not to
 * rebuild UCG's scheduling.
 */

export interface ServiceOffering {
  name: string;
  detail: string;
}

/** The services listed on the page, in its order. */
export const serviceOfferings: ServiceOffering[] = [
  { name: 'Oil Changes', detail: 'Routine oil and filter service.' },
  { name: 'Scheduled Maintenance', detail: 'Manufacturer-interval servicing to keep your warranty and resale value intact.' },
  { name: 'Brake Service', detail: 'Pads, rotors, fluid, and diagnostics.' },
  { name: 'Windshield Replacement', detail: 'Glass replacement and calibration.' },
  { name: 'Accident Repair', detail: 'Body and collision repair.' },
  { name: 'UCG Warranty Work', detail: 'Repairs covered under your 1-year comprehensive or 2-year Premium Protection Plan.' },
  {
    name: 'Wheels & Tires',
    detail: 'All-season, winter, performance, and runflat tires, plus TPMS packages. Request a tire quote for your vehicle.',
  },
];

/** Real request forms on usedcarguys.net — verified live 2026-09-03. */
export const serviceLinks = {
  /** First name, last name, email, WhatsApp, phone, vehicle year/make/model,
   * VIN, plate, "purchased from UCG?", and an enquiry field. */
  appointmentRequest: 'https://www.usedcarguys.net/book/',
  tireQuote: 'https://www.usedcarguys.net/service-center/tires-and-wheels/',
  warrantyAssistance: 'https://www.usedcarguys.net/warranty/',
  overview: 'https://www.usedcarguys.net/service-center/',
};

export const serviceContact = {
  phone: '+49 6371 92 000 30',
  /** Digits only, for wa.me links — this is the number the service-center
   * page itself links (wa.me/491737656926). The page also prints a second
   * number (+49 1522 8806145) without saying how the two differ, so only
   * the linked one is used here rather than guessing. */
  whatsapp: '491737656926',
  email: 'online@usedcarguys.net',
  address: 'Ludwig-Erhard-Str 8, 66877 Ramstein-Miesenbach (Ramstein Superstore)',
};
