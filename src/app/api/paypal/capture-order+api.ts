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
    console.error('PayPal capture-order failed:', error);
    return Response.json(
      { error: 'Could not confirm your payment — no charge was completed. Try again or contact us.' },
      { status: 502 },
    );
  }
}
