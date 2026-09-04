import Anthropic from '@anthropic-ai/sdk';

import {
  AI_CHAT_ENABLED,
  AI_CHAT_HISTORY_WINDOW,
  AI_CHAT_MAX_MESSAGE_LENGTH,
  AI_CHAT_MAX_USER_MESSAGES,
} from '@/constants/ai-chat';
import { usareurBases } from '@/constants/mock-data';

const NOT_CONNECTED_REPLY = "Our AI assistant isn't fully connected yet — a specialist will follow up with you directly.";
const CONVERSATION_LIMIT_REPLY =
  "We've covered a lot in this chat — let's continue with a real specialist from here. Tap \"Stuck and can't move forward?\" below to reach one on WhatsApp.";

/**
 * The AI agent's backend — this is the whole reason it's a server route
 * (`+api.ts`) and not a plain client-side call: the Anthropic API key
 * lives in `process.env.ANTHROPIC_API_KEY` here, server-side only, and is
 * never bundled into the app the way a client-side call would require.
 * Same rule already applied to DealerTeam credentials — no secret ever
 * ships inside app code.
 *
 * Requires a local `.env` file (gitignored, see .gitignore) with:
 *   ANTHROPIC_API_KEY=sk-ant-...
 * Works today against `npx expo start`'s dev server, which is what Expo
 * Go talks to during testing — no separate hosting needed yet. For a real
 * published app, this route needs real hosting (EAS Hosting or similar)
 * and the `origin` config in app.json's expo-router plugin — see
 * docs/backend-and-ai-agent-plan.md, this is that plan's "Tier 1" agent.
 */

interface ChatRequestBody {
  messages: { role: 'user' | 'assistant'; content: string }[];
  context?: {
    carLabel?: string;
    base?: string;
    paymentMethod?: string;
    /** 'have' or 'not_yet' — whether the customer's APO/FPO address is on file. */
    apoAddressStatus?: string;
    /** 'accepted' | 'declined' | undefined — the 2-Year PPP decision. */
    warranty?: string;
  };
}

// Everything below is real, verified content gathered this session — not
// invented. Keeping it here (not left for the model to guess at) is what
// keeps the agent from hallucinating UCG-specific facts.
const SYSTEM_PROMPT = `You are the "UCG Assistant" — the AI guide for Used Car Guys (UCG), a
used-car dealership serving US military stationed in Germany. You walk the
customer through buying (or selling) a car start to finish: answering
questions, explaining each step, and keeping things moving. You are an AI,
not a person — never claim to be a specific named human. Be warm, direct,
and useful. Keep answers short (a few sentences, not an essay) unless the
customer clearly wants detail.

A real UCG salesperson is assigned by management once the customer places a
deposit — they handle delivery and logistics from there. Before that, the
customer is with you. If the customer is genuinely stuck and cannot move
forward, tell them there's a "Stuck and can't move forward?" link at the
bottom of this screen that messages a real UCG specialist on WhatsApp —
that's a last resort, not the first answer to every question.

WHAT YOU KNOW (real, verified — don't guess beyond this):

Locations: Ramstein, Kaiserslautern, Stuttgart, Spangdahlem, Grafenwoehr,
Wiesbaden.

Bases customers are commonly headed to: ${usareurBases.join(', ')}, or others.

USAREUR driver's license: the REAL exam can be taken online before landing
in Germany via Joint Knowledge Online (JKO, jko.jten.mil) — course "USA 007"
then exam "USA 007B", 85% or higher to pass, certification valid 60 days.
Non-CAC family members can request a free sponsored account. Browsers may
show a "not private" warning on JKO — that's normal for DoD sites, safe to
continue through. On arrival: bring the printed certificate, stateside
license, DoD ID/CAC, and a $30 fee to the base testing station for a vision
check. A free study manual (no login) is at the official Army Garrison page
if they want to prepare first instead of testing immediately.

Warranty — 1-Year Comprehensive (included in price) vs. 2-Year Premium
Protection Plan ($999, or ~$16-18/mo financed): the 2-year is true bumper-
to-bumper (all electrical/mechanical parts except wear-and-tear and
fluids), $0 deductible on parts AND labor (1-year has a deductible on
parts once a car's over 40,000 miles), unlimited mileage, priority access
to UCG's courtesy car fleet, and a €10,000 max claim (vs €3,300 on the
1-year). 2-year eligibility: car must be newer than 2019 and under 70,000
miles.

APO/FPO address: the customer's military mailing address in Germany. It's
frequently not assigned until they in-process at their unit. It's the piece
the Vehicle Registration Office (VRO) needs to register the car, issue
plates, and issue the environmental sticker — so if it's not on file yet,
gently remind them to add it in "Edit My Info" once they have it. Almost
always "APO AE" for Germany.

Buying process: choose a car → submit interest → financing (cash or loan,
lender/down payment noted) → deposit holds the car 5 days → contract →
pickup. EU-spec cars with a "DEN" stock number prefix (not just "DE") need
a different process — a "Super" VAT Form from the VAT office with a UCG
cost estimate, stamped at the UCG location of purchase — tell the customer
to ask their specialist about this specifically if their car has a DEN
stock number, don't try to fully explain the VAT process yourself.

Selling a car TO UCG (Sell It Back): submit car info → get a real offer by
text within one business day (you cannot generate a price yourself — never
invent a dollar figure) → accept it → book a pre-buy inspection.

WHAT YOU DON'T KNOW: real-time deal status, financing approval status,
exact delivery dates, or anything account-specific — there's no live
system connected yet. Don't guess at these; say a specialist will confirm.

WHEN YOU DON'T KNOW SOMETHING: if it's account-specific (their exact
deal status, financing approval, delivery date) or you genuinely don't
know the answer, say so plainly and tell them a specialist will follow
up with them directly — don't pretend to look something up you can't
access. If they're truly blocked, point them to the "Stuck and can't
move forward?" WhatsApp link at the bottom of the screen.`;

export async function POST(request: Request) {
  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: 'messages is required' }, { status: 400 });
  }

  // The owner's kill switch (src/constants/ai-chat.ts) — checked
  // server-side too, not just hidden in the client screen, so it actually
  // stops spend even against a direct call to this route.
  if (!AI_CHAT_ENABLED) {
    return Response.json({ reply: NOT_CONNECTED_REPLY });
  }

  // Cost guards, enforced here even though the client (salesperson.tsx)
  // already enforces its own copies — a client-side limit alone doesn't
  // stop someone calling this route directly. See ai-chat.ts for why each
  // of these exists.
  const userMessageCount = body.messages.filter((m) => m.role === 'user').length;
  if (userMessageCount > AI_CHAT_MAX_USER_MESSAGES) {
    return Response.json({ reply: CONVERSATION_LIMIT_REPLY });
  }
  if (body.messages.some((m) => typeof m.content !== 'string' || m.content.length > AI_CHAT_MAX_MESSAGE_LENGTH)) {
    return Response.json({ error: 'A message is too long' }, { status: 400 });
  }

  const contextLine = body.context
    ? `\n\nThis customer's submission: car — ${body.context.carLabel ?? 'not specified'}; base — ${
        body.context.base ?? 'not specified'
      }; payment — ${body.context.paymentMethod ?? 'not specified'}; APO/FPO address on file — ${
        body.context.apoAddressStatus === 'have' ? 'yes' : 'not yet'
      }; 2-year Premium Protection Plan — ${body.context.warranty ?? 'not decided yet'}.`
    : '';

  // Checked directly, not inferred from a caught error's message/type —
  // that was tried first and missed a real case: `new Anthropic()` throws
  // "Could not resolve authentication method..." when NO credential
  // source exists at all, which isn't an `Anthropic.AuthenticationError`
  // (that's the server rejecting a bad key) and doesn't even mention
  // "ANTHROPIC_API_KEY" in its text — so the old string-match fell
  // through to the more alarming generic fallback instead of the
  // accurate "isn't connected yet" one. Checking the env var directly
  // sidesteps guessing at the SDK's exact error shape entirely.
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ reply: NOT_CONNECTED_REPLY });
  }

  try {
    // Constructed here, inside the try — not at module scope. The SDK
    // throws SYNCHRONOUSLY at construction (not just when a request is
    // made) when it can't resolve any credentials at all, which was a
    // real bug: a module-scope `new Anthropic()` threw before this
    // function's own try/catch ever got a chance to run, crashing the
    // whole route instead of degrading to the honest fallback below.
    const client = new Anthropic();
    const response = await client.messages.create({
      // Haiku 4.5, not Opus — this chat runs on a $5 API key Terry funds
      // himself (Sept 4), so cost per turn matters. Haiku 4.5 handles this
      // system prompt (fixed, verified UCG facts, not open-ended reasoning)
      // comfortably at roughly 2 cents a conversation instead of Opus
      // pricing. Revisit if replies start feeling shallow for what
      // customers actually ask.
      model: 'claude-haiku-4-5-20251001',
      // Trimmed from 1024 (Sept 6, alongside the other ai-chat.ts limits)
      // — the system prompt already asks for a few sentences, not an
      // essay; this just puts a firmer ceiling on worst-case output cost.
      max_tokens: 600,
      system: SYSTEM_PROMPT + contextLine,
      // Only the most recent AI_CHAT_HISTORY_WINDOW messages actually get
      // sent, not the whole conversation — see ai-chat.ts: resending full
      // history every turn is what makes a chat's total cost grow with
      // the square of its length, not linearly. The customer's own screen
      // still shows everything; the model just won't recall further back.
      messages: body.messages.slice(-AI_CHAT_HISTORY_WINDOW).map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return Response.json({ reply: textBlock?.text ?? "Sorry, I didn't catch that — could you try again?" });
  } catch (error) {
    // Reaching here means ANTHROPIC_API_KEY IS set but something else
    // failed (bad key, network issue, rate limit, etc.) — genuinely an
    // error, not just "not set up yet", so the generic message is the
    // right one now that the missing-key case is handled above.
    console.error('AI agent request failed:', error);
    const isAuthError = error instanceof Anthropic.AuthenticationError;
    return Response.json(
      {
        reply: isAuthError ? NOT_CONNECTED_REPLY : 'Something went wrong on our end — please try again in a moment.',
      },
      { status: 200 },
    );
  }
}
