// Reads a UCG deal document (Purchase Order, Cost Estimate, Bill of Sale,
// AE Form 550-175A/B) and returns its fields, so the customer doesn't
// copy numbers by hand and the app can check a 550 against the deal
// (Terry, 2026-11-19).
//
// - Signed-in customers only (the app sends their session token).
// - Nothing is stored: the file is passed to Claude and the fields come
//   back to the phone, where the customer checks them before saving.
// - The Anthropic key is a Supabase secret (ANTHROPIC_API_KEY), never in
//   the app.

import '@supabase/functions-js/edge-runtime.d.ts';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ~9 MB of file. A two-page colour scan from the app is about 1–2 MB.
const MAX_BASE64_CHARS = 12_000_000;

const DocumentFields = z.object({
  document_type: z.enum(['purchase_order', 'cost_estimate', 'bill_of_sale', 'ae550a', 'ae550b', 'other']),
  deal_number: z.string().nullable(),
  stock_number: z.string().nullable(),
  vin: z.string().nullable(),
  vehicle_year: z.number().int().nullable(),
  vehicle_make: z.string().nullable(),
  vehicle_model: z.string().nullable(),
  vehicle_color: z.string().nullable(),
  odometer: z.number().int().nullable(),
  total_price: z.number().nullable(),
  deposit: z.number().nullable(),
  document_date: z.string().nullable(),
  customer_name: z.string().nullable(),
  salesperson_name: z.string().nullable(),
  salesperson_phone: z.string().nullable(),
  dealership_location: z.string().nullable(),
  lender: z.string().nullable(),
  unclear: z.array(z.string()),
});

const SYSTEM = `You read car-deal paperwork from The Used Car Guys (UCG), a dealer selling used American-spec cars to US military members in Germany, and return its fields exactly as printed.

Documents you may see:
- purchase_order: UCG Purchase Order (customer buys a car). Has Deal #, Stock #, salesperson name and phone at the top right, the car, VIN, odometer, "Total Price (AE550/VAT Form)", and usually a $300 deposit.
- cost_estimate: UCG Cost Estimate for a "DEN" car (stock number starts with DEN). total_price is the "Total Price", NOT the larger "Total Amount" that includes MWST (German VAT). A Cost Estimate never has a deposit: return null for deposit.
- bill_of_sale: UCG Bill of Sale (UCG buys the customer's car). total_price is "Total Vehicle Price (AE550)".
- ae550a / ae550b: US Forces customs forms AE Form 550-175A (purchase) or 550-175B (sale). Often hand-filled or stamped scans. Read the VIN, owner/purchaser name, vehicle, price and date.
- other: anything else.

Rules:
- Copy values exactly; never guess or invent. If a field is missing or you can't read it with confidence, return null and add the field name to "unclear".
- VIN: 17 characters, no spaces; the letters I, O and Q never appear in a VIN.
- Money: a plain number in US dollars, no symbols or thousands separators.
- document_date: YYYY-MM-DD. The deal date on a Purchase Order, the date on a Cost Estimate, the purchase date on a Bill of Sale, the issue date on a 550.
- odometer: whole number as printed (miles or km).
- dealership_location: the UCG location's town if the document names one (e.g. Ramstein, Stuttgart, Spangdahlem, Grafenwöhr, Wiesbaden), else null.
- customer_name: the buyer (Purchase Order, Cost Estimate, 550-175A) or seller (Bill of Sale, 550-175B).`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  // Signed-in customers only.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData?.user) return json({ error: 'not_signed_in' }, 401);

  let body: { file?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const file = body.file ?? '';
  const mimeType = body.mimeType ?? 'application/pdf';
  if (!file || file.length > MAX_BASE64_CHARS) return json({ error: 'file_too_large' }, 413);
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType)) return json({ error: 'unsupported_type' }, 415);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'not_configured' }, 503);
  const client = new Anthropic({ apiKey });

  const source =
    mimeType === 'application/pdf'
      ? ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file } } as const)
      : ({ type: 'image', source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png', data: file } } as const);

  try {
    const message = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(DocumentFields) },
      system: SYSTEM,
      messages: [{ role: 'user', content: [source, { type: 'text', text: 'Read this document and return its fields.' }] }],
    });
    if (message.stop_reason === 'refusal' || !message.parsed_output) {
      return json({ error: 'unreadable' }, 422);
    }
    return json({ fields: message.parsed_output });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429);
    if (error instanceof Anthropic.BadRequestError) return json({ error: 'unreadable' }, 422);
    console.error('read-document failed', error instanceof Anthropic.APIError ? error.status : error);
    return json({ error: 'failed' }, 502);
  }
});
