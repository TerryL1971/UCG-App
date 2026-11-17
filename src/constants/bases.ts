/**
 * The U.S. military communities in Germany a UCG customer can be
 * stationed at — and, per base, the local rules for registering and
 * deregistering a car (Terry, 2026-11-17: "Every base has its own rules
 * for registering a car and de-registering a car… A customer based at
 * Stuttgart has a different roadmap than a person based in Ramstein").
 *
 * The customer picks their base at sign-up and can change it any time
 * (e.g. bought in Wiesbaden, PCS'd to Stuttgart, now selling there). The
 * roadmap always follows their CURRENT base.
 *
 * `BASE_RULES` is deliberately empty until Terry has each base's real
 * rules — nothing here is guessed. A base without rules shows a plain
 * "your salesperson confirms the local details" note instead.
 */

export interface Base {
  /** Stored on the account; never shown. */
  id: string;
  name: string;
}

export const BASES: Base[] = [
  { id: 'ramstein', name: 'Ramstein / KMC' },
  { id: 'baumholder', name: 'Baumholder' },
  { id: 'wiesbaden', name: 'Wiesbaden' },
  { id: 'spangdahlem', name: 'Spangdahlem' },
  { id: 'stuttgart', name: 'Stuttgart' },
  { id: 'grafenwoehr', name: 'Grafenwöhr' },
  { id: 'vilseck', name: 'Vilseck' },
  { id: 'ansbach', name: 'Ansbach' },
  { id: 'illesheim', name: 'Illesheim' },
  { id: 'hohenfels', name: 'Hohenfels' },
];

export function baseName(id: string | null | undefined): string | null {
  if (!id) return null;
  return BASES.find((b) => b.id === id)?.name ?? null;
}

/**
 * One base's local rules. Fill in a base when its information arrives;
 * every field is optional, so a base can be added a piece at a time.
 *
 * `stepNotes` adds the base's own instructions to a roadmap step, keyed
 * by flow and step id from lib/deal-flow.ts — e.g. for Stuttgart:
 *
 *   stepNotes: {
 *     purchase: { registration: 'At Stuttgart, book a VRO appointment first at …' },
 *     sale: { deregister: 'Stuttgart deregisters on Tuesdays only …' },
 *   }
 */
export interface BaseRules {
  stepNotes?: Partial<Record<'purchase' | 'purchase_den' | 'sale', Partial<Record<string, string>>>>;
  /** Extra things to bring to this base's VRO, beyond the standard list. */
  vroExtras?: string[];
}

export const BASE_RULES: Record<string, BaseRules> = {
  // Add each base here as its rules come in, e.g.:
  // stuttgart: { stepNotes: { purchase: { registration: '…' } } },
};

/** The steps where a base's own rules matter most — they get a "your
 * salesperson confirms the local details" note while a base's rules
 * haven't been added yet. */
export const BASE_SENSITIVE_STEPS = ['customs_office', 'registration', 'deregister'];
