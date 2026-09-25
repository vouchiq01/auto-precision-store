import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';
import { env, razorpayConfigured } from '../env.ts';
import { PaymentConfigError, PaymentVerificationError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';

/**
 * Razorpay integration.
 *
 * The rule that governs everything here: the browser's success callback is a
 * *hint*, and the `payment.captured` webhook is the truth. The callback usually
 * arrives first and lets us show a confirmation page quickly, but an order is
 * only really paid once a signed webhook says so.
 */

let client: Razorpay | null = null;

function getClient(): Razorpay {
  if (!razorpayConfigured) throw new PaymentConfigError();
  if (!client) {
    client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID as string, key_secret: env.RAZORPAY_KEY_SECRET as string });
  }
  return client;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

/**
 * Create the Razorpay order. `amount` is in paise, which is exactly how we
 * store money, so no conversion happens here and none can go wrong.
 */
export async function createRazorpayOrder(params: {
  amount: number; receipt: string; notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const rzp = getClient();

  const order = await rzp.orders.create({
    amount: params.amount,
    currency: 'INR',
    receipt: params.receipt,
    notes: params.notes ?? {},
  });

  logger.info({ razorpayOrderId: order.id, amount: params.amount }, 'razorpay order created');

  return {
    id: order.id,
    amount: Number(order.amount),
    currency: order.currency,
    receipt: String(order.receipt ?? params.receipt),
  };
}

/** Constant-time comparison; a length mismatch alone must not leak via timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verify the checkout callback signature:
 *   HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
 */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string;
}): void {
  if (!razorpayConfigured) throw new PaymentConfigError();

  const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET as string)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');

  if (!safeEqual(expected, params.razorpaySignature)) {
    logger.error({ razorpayOrderId: params.razorpayOrderId, razorpayPaymentId: params.razorpayPaymentId },
      'payment signature mismatch — possible forgery attempt');
    throw new PaymentVerificationError();
  }
}

/**
 * Verify a webhook. The signature covers the RAW request body, so the route
 * must hand us the unparsed buffer — re-serialising the parsed JSON changes
 * key order and whitespace and the signature will never match.
 */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string): void {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('RAZORPAY_WEBHOOK_SECRET is not set — refusing to trust an unverifiable webhook');
    throw new PaymentVerificationError('Webhooks are not configured.');
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!safeEqual(expected, signature)) {
    logger.error('webhook signature mismatch — rejecting');
    throw new PaymentVerificationError('Webhook signature did not match.');
  }
}

export async function fetchPayment(paymentId: string) {
  return getClient().payments.fetch(paymentId);
}

export async function refundPayment(paymentId: string, amountPaise?: number) {
  const rzp = getClient();
  return rzp.payments.refund(paymentId, amountPaise ? { amount: amountPaise } : {});
}

export function publicKeyId(): string | null {
  return razorpayConfigured ? (env.RAZORPAY_KEY_ID as string) : null;
}
