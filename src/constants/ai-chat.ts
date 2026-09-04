/**
 * Cost and availability controls for the UCG Assistant AI chat
 * (src/app/salesperson.tsx, backed by src/app/api/chat+api.ts). Added
 * 2026-09-06 at Terry's explicit request: "before using the AI, it needs
 * to be very limited or this will cost UCG a fortune. In fact, I may need
 * to scrap it, but I have to allow the owner to make that decision."
 *
 * Two separate levers, both read by both the client screen and the
 * server route (defense in depth — a client-only limit doesn't stop
 * someone hitting `/api/chat` directly):
 *
 *  1. `AI_CHAT_ENABLED` — the owner's kill switch. Flip to `false` and the
 *     chat screen stops calling the AI entirely (shows a plain
 *     "message a specialist instead" screen) and the server route refuses
 *     to call Anthropic even if hit directly. No other code changes
 *     needed, no API key removal required, and it's just as easy to flip
 *     back on later. This is the one constant meant for that decision —
 *     everything else below is a safety limit that applies either way.
 *
 *  2. The limits below. Anthropic bills by tokens actually sent and
 *     received. The single biggest cost driver in ANY chat UI is that
 *     naively resending the full conversation as input on every turn
 *     makes a conversation's total cost grow with roughly the SQUARE of
 *     its length, not linearly — a 20-message conversation isn't 2x a
 *     10-message one, it's closer to 4x. `AI_CHAT_HISTORY_WINDOW` is the
 *     fix for that specifically; the other two bound a single runaway or
 *     abusive conversation/message.
 */

export const AI_CHAT_ENABLED = true;

/** Hard stop on a conversation — past this many customer messages, the
 * chat tells them to continue with a human instead of calling the API
 * again, the same off-ramp already used for "Stuck and can't move
 * forward." Keeps one long or abusive conversation from generating
 * unbounded cost. */
export const AI_CHAT_MAX_USER_MESSAGES = 12;

/** How much conversation history actually gets sent to Anthropic per
 * turn — the biggest lever on cost (see file comment). Older turns beyond
 * this window are dropped from the API request only; the customer's own
 * screen still shows the full conversation, and the assistant just won't
 * remember anything further back than this many messages. */
export const AI_CHAT_HISTORY_WINDOW = 10;

/** A single oversized message (e.g. someone pasting a huge block of text)
 * is its own cost/abuse vector independent of conversation length.
 * Enforced as the TextInput's own `maxLength` client-side, and re-checked
 * server-side against direct API calls. */
export const AI_CHAT_MAX_MESSAGE_LENGTH = 1000;
