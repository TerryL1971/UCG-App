// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

/**
 * Lets a customer pull back their own generated/signed paperwork using
 * their deal code (document-storage.ts's getOwnerId — an 8-character
 * code, not a real account) instead of relying on local, this-session-
 * only state. Terry, 2026-09-21: "a salesperson needs to sign and scan
 * the document back into the app... [and] allows the customer to print
 * any and all documents on demand" — the code is the lighter-weight
 * stand-in for real per-customer auth that makes that safe enough to
 * build now, without holding this on real accounts existing first.
 *
 * Deliberately narrower than "every document this code owns": only
 * `generated` (an app-produced sample PDF) and `signed` (a photographed
 * signed copy) come back — never `scan` (identity documents, e.g. the
 * driver's license). No strong reason to expose those through a
 * lighter-auth code lookup when the actual use case here is paperwork.
 *
 * Runs with the project's service-role privileges (ctx.supabaseAdmin) —
 * this is the ONE place that key is ever used; it never ships to the
 * client app. That's what makes returning a signed URL here safe even
 * though the `documents` bucket itself has no public SELECT policy.
 */
const CODE_PATTERN = /^[A-Z2-9]{8}$/;
const RATE_LIMIT_WINDOW_MINUTES = 5;
const RATE_LIMIT_MAX_ATTEMPTS = 20;
const SIGNED_URL_TTL_SECONDS = 600;

export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req, ctx) => {
    let code: string;
    try {
      const body = await req.json();
      code = String(body?.code ?? "").trim().toUpperCase();
    } catch {
      return Response.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (!CODE_PATTERN.test(code)) {
      return Response.json({ error: "That code doesn't look right — check it and try again." }, { status: 400 });
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    // Basic abuse guard — this code is a lighter stand-in for real auth
    // (Terry's explicit call, not an oversight), so it's worth at least
    // making sustained guessing slow and visible rather than free.
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
    const { count: recentAttempts } = await ctx.supabaseAdmin
      .from("deal_code_lookup_attempts")
      .select("*", { count: "exact", head: true })
      .eq("client_ip", clientIp)
      .gte("created_at", windowStart);

    if ((recentAttempts ?? 0) >= RATE_LIMIT_MAX_ATTEMPTS) {
      return Response.json({ error: "Too many attempts — try again in a few minutes." }, { status: 429 });
    }

    const { data: rows, error: queryError } = await ctx.supabaseAdmin
      .from("deal_documents")
      .select("doc_id, kind, storage_path, created_at")
      .eq("owner_id", code)
      .in("kind", ["generated", "signed"])
      .order("created_at", { ascending: false });

    await ctx.supabaseAdmin.from("deal_code_lookup_attempts").insert({
      code,
      client_ip: clientIp,
      found: !queryError && !!rows?.length,
    });

    if (queryError) {
      return Response.json({ error: "Something went wrong looking that up." }, { status: 500 });
    }

    // Same response shape whether the code is unknown or just has no
    // documents yet — nothing here should let someone distinguish
    // "wrong code" from "right code, nothing uploaded."
    const documents = await Promise.all(
      (rows ?? []).map(async (row) => {
        const { data: signed } = await ctx.supabaseAdmin.storage
          .from("documents")
          .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
        return {
          docId: row.doc_id,
          kind: row.kind,
          createdAt: row.created_at,
          url: signed?.signedUrl ?? null,
        };
      }),
    );

    return Response.json({ documents: documents.filter((d) => d.url) });
  }),
};
