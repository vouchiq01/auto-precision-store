import { STORE } from '../constants.ts';
import { formatINR } from '../money.ts';
import type { OrderStatus } from '../constants.ts';

/**
 * The words an admin sends a customer on WhatsApp for each order status.
 *
 * This is the manual path: the admin taps a button, WhatsApp opens (wa.me) with this text already
 * typed into the customer's chat, and one more tap sends it. No API, no approved template — it is an
 * ordinary message from the owner's own WhatsApp. Plain text only (WhatsApp renders *bold*).
 * Every line is built from the order's own fields; nothing is promised that the data cannot back —
 * no delivery date is stated, because we do not have one.
 */
export interface OrderMessageInput {
  orderNumber: string;
  status: OrderStatus;
  customerName?: string | null;
  grandTotal: number;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}

export function orderWhatsappMessage(order: OrderMessageInput): string {
  const first = order.customerName?.trim().split(/\s+/)[0];
  const hello = first ? `Hi ${first},` : 'Hi,';
  const ref = `*${order.orderNumber}*`;
  const total = formatINR(order.grandTotal);
  const sign = `— ${STORE.name}`;

  switch (order.status) {
    case 'pending_payment':
      return `${hello}\nWe received your order ${ref} (${total}) but the payment has not come through yet. Your table is being held for a short while. Could you complete the payment, or reply here if you need help?\n${sign}`;
    case 'paid':
      return `${hello}\nThank you! We have received your payment of ${total} for order ${ref}. We will confirm it shortly and keep you updated at each step.\n${sign}`;
    case 'confirmed':
      return `${hello}\nYour order ${ref} is confirmed. We are getting it ready and will message you again when it is packed.\n${sign}`;
    case 'packed':
      return `${hello}\nGood news: your order ${ref} is packed and ready to leave our Bengaluru warehouse. We will share the tracking details as soon as it ships.\n${sign}`;
    case 'shipped': {
      const lines = [`${hello}`, `Your order ${ref} has been shipped.`];
      if (order.trackingNumber) {
        lines.push(`Courier: ${order.carrier ?? 'see link'}`, `Tracking no.: ${order.trackingNumber}`);
        if (order.trackingUrl) lines.push(`Track it here: ${order.trackingUrl}`);
      }
      lines.push('Please keep your phone handy, the courier will call before delivery.', sign);
      return lines.join('\n');
    }
    case 'delivered':
      return `${hello}\nYour order ${ref} is marked as delivered. We hope it works well for you! If anything is not right, just reply to this message and we will sort it out.\n${sign}`;
    case 'cancelled':
      return `${hello}\nYour order ${ref} has been cancelled. If you did not ask for this, or want to place it again, please reply here and we will help.\n${sign}`;
    case 'refunded':
      return `${hello}\nThe refund of ${total} for order ${ref} has been processed. It can take a few working days to show in your account, depending on your bank.\n${sign}`;
  }
}

/** A 10-digit Indian mobile (the form we store) → the digits wa.me wants, with the country code. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return null;
}

/** The link that opens WhatsApp on that customer's chat with `text` typed in. Null if no usable number. */
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}
