import { getPayPalAccessToken, paypalFetch } from '@/lib/paypal-server';

/**
 * Creates a PayPal order and hands back the hosted "approve" URL — this
 * app can't use PayPal's JS SDK popup (that's web-only), so the flow here
 * is the classic redirect one: open `approveUrl` in a browser (client
 * uses `expo-web-browser`'s `openAuthSessionAsync`), the customer
 * approves on PayPal's own page, PayPal redirects back to `returnUrl`
 * (a deep link into this app — `Linking.createURL(...)`), and the client
 * then calls `capture-order+api.ts` to actually take the payment.
 */
interface CreateOrderBody {
  amount: string;
  currency?: string;
  returnUrl: string;
  cancelUrl: string;
  description?: string;
}

export async function POST(request: Request) {
  let body: CreateOrderBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.amount || !body.returnUrl || !body.cancelUrl) {
    return Response.json({ error: 'amount, returnUrl, and cancelUrl are required' }, { status: 400 });
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const order = await paypalFetch('/v2/checkout/orders', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: body.description ?? 'Used Car Guys — car hold deposit',
            amount: {
              currency_code: body.currency ?? 'USD',
              value: body.amount,
            },
          },
        ],
        application_context: {
          brand_name: 'Used Car Guys',
          user_action: 'PAY_NOW',
          return_url: body.returnUrl,
          cancel_url: body.cancelUrl,
        },
      }),
    });

    const approveUrl = (order.links as { rel: string; href: string }[])?.find((l) => l.rel === 'approve')?.href;
    if (!approveUrl) {
      throw new Error('PayPal order created without an approve link');
    }

    return Response.json({ orderId: order.id, approveUrl });
  } catch (error) {
    console.error('PayPal create-order failed:', error);
    return Response.json({ error: 'Could not start the PayPal checkout — try again in a moment.' }, { status: 502 });
  }
}
