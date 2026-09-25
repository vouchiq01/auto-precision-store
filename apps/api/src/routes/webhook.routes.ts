import { Router, raw } from 'express';
import { getDb, payments } from '@aps/db';
import { eq } from 'drizzle-orm';
import { asyncHandler } from '../lib/async-handler.ts';
import { logger } from '../lib/logger.ts';
import { verifyWebhookSignature } from '../services/razorpay.service.ts';
import { findOrderByRazorpayOrderId, markOrderPaid, recordFailedPayment } from '../services/order.service.ts';

export const webhookRouter: Router = Router();

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string; order_id?: string; status?: string; method?: string;
        error_code?: string; error_description?: string; amount?: number;
      };
    };
  };
}

/**
 * Razorpay webhook — the authoritative record of what was actually paid.
 *
 * Two things matter here and both are easy to get wrong:
 *
 *  1. The signature covers the RAW body. `express.raw` is mounted on this route
 *     specifically so the bytes are untouched; re-serialising parsed JSON
 *     changes key order and whitespace, and the signature never matches again.
 *
 *  2. We always answer 200 once the signature checks out, even if our own
 *     processing then fails. A non-2xx makes Razorpay retry for hours, and a
 *     retry storm against a bug is worse than a missed event we can reconcile
 *     from the payments table.
 */
webhookRouter.post('/razorpay',
  raw({ type: 'application/json', limit: '1mb' }),
  asyncHandler(async (req, res) => {
    const signature = req.get('x-razorpay-signature');
    if (!signature) {
      res.status(400).json({ error: 'Missing signature' });
      return;
    }

    const rawBody = req.body as Buffer;
    verifyWebhookSignature(rawBody, signature);

    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookPayload;
    } catch {
      res.status(400).json({ error: 'Malformed JSON' });
      return;
    }

    const entity = payload.payload?.payment?.entity;
    logger.info({ event: payload.event, paymentId: entity?.id }, 'razorpay webhook received');

    // Acknowledge first; process after. Razorpay stops retrying, and any failure
    // below is ours to find in the logs rather than something it keeps hammering.
    res.status(200).json({ received: true });

    if (!entity?.id || !entity.order_id) return;

    try {
      const orderId = await findOrderByRazorpayOrderId(entity.order_id);
      if (!orderId) {
        logger.warn({ razorpayOrderId: entity.order_id }, 'webhook for an unknown razorpay order');
        return;
      }

      switch (payload.event) {
        case 'payment.captured':
        case 'order.paid':
          await markOrderPaid({
            orderId,
            razorpayPaymentId: entity.id,
            razorpayOrderId: entity.order_id,
            method: entity.method,
            raw: entity as unknown as Record<string, unknown>,
            source: 'webhook',
          });
          break;

        case 'payment.failed':
          await recordFailedPayment({
            orderId,
            razorpayPaymentId: entity.id,
            errorCode: entity.error_code,
            errorDescription: entity.error_description,
            raw: entity as unknown as Record<string, unknown>,
          });
          break;

        case 'refund.processed': {
          const db = getDb();
          await db.update(payments).set({ status: 'refunded', updatedAt: new Date() })
            .where(eq(payments.razorpayPaymentId, entity.id));
          break;
        }

        default:
          logger.debug({ event: payload.event }, 'unhandled razorpay event');
      }
    } catch (error) {
      logger.error({ err: error, event: payload.event, paymentId: entity.id }, 'webhook processing failed after ack');
    }
  }),
);
