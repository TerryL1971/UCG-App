// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

/**
 * Deletes the signed-in customer's own account (Apple requires in-app
 * account deletion). Only ever the caller's account: the user is taken
 * from their own login token, never from the request body.
 *
 * Deleting a user needs the service-role key, which exists only here on
 * the server (Supabase provides it to Edge Functions automatically) —
 * never in the app.
 *
 * What happens to their data (database foreign keys do this):
 *  - their private chat thread and its messages are deleted
 *  - their deals stay — UCG's record of a vehicle sale — but are no
 *    longer linked to any account (customer_id becomes null)
 *  - documents stay with the deal; the uploader link becomes null
 *
 * Deploy: Supabase dashboard → Edge Functions → Deploy a new function →
 * name it `delete-account`, paste this file, deploy. (Or, once the CLI
 * can log in: `supabase functions deploy delete-account`.)
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "not_signed_in" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Who is asking — from their own token.
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await asUser.auth.getUser();
  if (userError || !user) return json({ error: "not_signed_in" }, 401);

  // Staff accounts are removed by an admin, not from the app, so a
  // salesperson can't accidentally orphan their deals.
  const admin = createClient(url, serviceKey);
  const { data: staff } = await admin.from("staff_members").select("user_id").eq("user_id", user.id).maybeSingle();
  if (staff) return json({ error: "staff_account" }, 403);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("delete-account failed:", error.message);
    return json({ error: "delete_failed" }, 500);
  }
  return json({ deleted: true });
});
