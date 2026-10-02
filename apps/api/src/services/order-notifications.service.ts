import { ORDER_STATUS_LABELS, STORE, formatINR, type Order, type OrderStatus } from '@aps/shared';
import { env } from '../env.ts';
import { logger } from '../lib/logger.ts';
import { getWhatsappProvider } from './whatsapp/index.ts';

/**
 * WhatsApp order-event notifications: a new order alerts the seller, a status
 * change alerts the buyer. Neither can ever fail the operation that triggered
 * it — a checkout or an admin status change must succeed on its own merits,
 * with the message as a side effect that is logged and swallowed on error,
 * the same discipline this codebase already applies to saving the address
 * book from checkout (see rememberAddress in checkout.service.ts).
 *
 * Every send here is a WhatsApp TEMPLATE message, not free text — these are
 * business-initiated (nobody messaged us first), so Meta requires a template
 * it has already approved. The exact body params below are a reasonable
 * starting guess (order number, name, amount, and one more field), not a
 * guarantee they match whatever template actually gets approved: once you
 * have the real template text, come back here and line bodyParams up with
 * its {{1}}, {{2}}, {{3}}… placeholders in the same order.
 */

/** Stored phone numbers are a bare 10-digit Indian mobile (see phoneSchema) —
    WhatsApp's Cloud API wants the country code included. */
function toWhatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

async function send(to: string, template: string | undefined, languageCode: string, bodyParams: string[]): Promise<void> {
  if (!template) {
    logger.debug({ to }, 'WhatsApp template not configured — skipping notification');
    return;
  }
  try {
    await getWhatsappProvider().sendTemplate({ to: toWhatsappNumber(to), template, languageCode, bodyParams });
  } catch (error) {
    // A notification failure is never the customer's or the admin's problem.
    logger.error({ err: error, to, template }, 'WhatsApp notification failed to send');
  }
}

/** Fired once, right after an order is created — regardless of whether it has
    been paid for yet, since the seller wants to know the moment it happens. */
export async function notifySellerOfNewOrder(params: {
  orderNumber: string; grandTotal: number; customerName: string; customerPhone: string; itemCount: number;
}): Promise<void> {
  if (!env.SELLER_WHATSAPP_NUMBER) {
    logger.debug('SELLER_WHATSAPP_NUMBER not configured — skipping new-order notification');
    return;
  }
  await send(env.SELLER_WHATSAPP_NUMBER, env.WHATSAPP_TEMPLATE_ORDER_PLACED, env.WHATSAPP_TEMPLATE_ORDER_PLACED_LANG, [
    params.orderNumber,
    params.customerName,
    formatINR(params.grandTotal),
    `${params.itemCount} ${params.itemCount === 1 ? 'item' : 'items'}`,
  ]);
}

/** Fired on every status change the buyer should hear about. */
export async function notifyBuyerOfStatusChange(order: Order, newStatus: OrderStatus): Promise<void> {
  const phone = order.shippingAddress.phone;
  if (typeof phone !== 'string' || !phone) return;

  const statusLabel = ORDER_STATUS_LABELS[newStatus];
  const extra = newStatus === 'shipped' && order.trackingNumber
    ? `${order.carrier ? `${order.carrier}, ` : ''}tracking ${order.trackingNumber}`
    : STORE.name;

  await send(phone, env.WHATSAPP_TEMPLATE_ORDER_STATUS, env.WHATSAPP_TEMPLATE_ORDER_STATUS_LANG, [
    order.orderNumber,
    statusLabel,
    extra,
  ]);
}
