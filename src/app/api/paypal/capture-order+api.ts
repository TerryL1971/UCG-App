import { getPayPalAccessToken, paypalFetch } from '@/lib/paypal-server';

/** Captures payment on an order the customer already approved (after the
 * `create-order` → PayPal-hosted-approval → redirect-back flow). */
interface CaptureOrderBody {
  orderId: string;
}

export async function POST(request: Request) {
  let body: CaptureOrderBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.orderId) {
    return Response.json({ error: 'orderId is required' }, { status: 400 });
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const capture = await paypalFetch(`/v2/checkout/orders/${body.orderId}/capture`, {
      method: 'POST',
      accessToken,
    });

    const status = capture.status as string;
    return Response.json({ status, captureId: capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null });
  } catch (error) {
    console.error('PayPal capture-order failed, checking the order\'s real status before giving up:', error);
    // This call itself can fail on OUR side (a network blip, a timeout)
    // *after* PayPal has already captured the funds — telling the
    // customer "no charge was completed" in that case would be a false
    // guarantee, and a naive "just try again" retry creates a brand-new
    // order and risks a second, real charge (David, 2026-10-16: the
    // deposit→plates journey needs to almost-guarantee no problems for
    // the customer or UCG — this is the single highest-risk point in it,
    // real money with an otherwise-ambiguous outcome). Before giving up,
    // ask PayPal directly what the order's actual current status is —
    // read-only, moves no money, just resolves the ambiguity.
    try {
      const accessToken = await getPayPalAccessToken();
      const order = await paypalFetch(`/v2/checkout/orders/${body.orderId}`, {
        method: 'GET',
        accessToken,
      });
      if (order.status === 'COMPLETED') {
        return Response.json({
          status: 'COMPLETED',
          captureId: order.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null,
        });
      }
      // Genuinely not captured — safe to say so, and safe to retry.
      return Response.json(
        { error: 'Could not confirm your payment — no charge was completed. Try again or contact us.' },
        { status: 502 },
      );
    } catch (statusCheckError) {
      // Can't reach PayPal to confirm either way — the one case that's
      // genuinely ambiguous, and the only one worth telling the customer
      // not to just retry blindly.
      console.error('PayPal order-status check also failed:', statusCheckError);
      return Response.json(
        { error: "Couldn't confirm your payment status — please don't pay again yet.", ambiguous: true },
        { status: 502 },
      );
    }
  }
}
