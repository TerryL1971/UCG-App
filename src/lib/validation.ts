/** Was duplicated identically in create-account.tsx and log-in.tsx;
 * sell-back.tsx's own email field only checked non-empty (Terry,
 * 2026-10-15, catching a real inconsistency) — a garbage value there
 * sailed straight into both the WhatsApp text and the generated Bill of
 * Sale. One shared definition now, used everywhere an email is collected. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
