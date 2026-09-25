import PDFDocument from 'pdfkit';
import { eq } from 'drizzle-orm';
import { getDb, orderItems, orders, settings } from '@aps/db';
import { STORE, type OrderStatus } from '@aps/shared';
import { NotFoundError, ConflictError } from '../lib/errors.ts';

/**
 * GST tax invoice, generated as a PDF buffer.
 *
 * A compliant Indian tax invoice must carry: supplier name, address and GSTIN;
 * a consecutive invoice number and date; the recipient's details and GSTIN when
 * registered; HSN codes; taxable value; the CGST/SGST or IGST split with rates;
 * and the total in words. All of that is produced here.
 */

/**
 * PDF's built-in Helvetica has no glyph for the rupee sign, so formatINR's "₹"
 * silently renders as an apostrophe — unacceptable on a tax invoice. Embedding a
 * font that has it would add ~200 KB to every invoice; stating the currency once
 * in the column header and the footer is unambiguous and is what most Indian
 * invoices do anyway.
 */
function money(paise: number): string {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(paise / 100);
}

const PAGE_MARGIN = 48;
const INK = '#111111';
const MUTED = '#6B6B6B';
const RULE = '#DDDDDD';
const ACCENT = '#CE2B2B';

/** "One lakh ten thousand two hundred rupees only" — required on a tax invoice. */
export function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const paiseRemainder = paise % 100;

  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  function twoDigits(n: number): string {
    if (n < 20) return ones[n] ?? '';
    const t = tens[Math.floor(n / 10)] ?? '';
    const o = ones[n % 10] ?? '';
    return o ? `${t} ${o}` : t;
  }

  function threeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    const parts: string[] = [];
    if (hundred > 0) parts.push(`${ones[hundred]} hundred`);
    if (rest > 0) parts.push(twoDigits(rest));
    return parts.join(' ');
  }

  // Indian numbering: crore, lakh, thousand, hundred.
  function convert(n: number): string {
    if (n === 0) return 'zero';
    const parts: string[] = [];
    const crore = Math.floor(n / 10_000_000);
    const lakh = Math.floor((n % 10_000_000) / 100_000);
    const thousand = Math.floor((n % 100_000) / 1_000);
    const rest = n % 1_000;

    if (crore > 0) parts.push(`${convert(crore)} crore`);
    if (lakh > 0) parts.push(`${twoDigits(lakh)} lakh`);
    if (thousand > 0) parts.push(`${twoDigits(thousand)} thousand`);
    if (rest > 0) parts.push(threeDigits(rest));
    return parts.join(' ');
  }

  const rupeeWords = `${convert(rupees)} rupees`;
  const full = paiseRemainder > 0 ? `${rupeeWords} and ${twoDigits(paiseRemainder)} paise` : rupeeWords;
  return `${full.charAt(0).toUpperCase()}${full.slice(1)} only`;
}

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return (row?.value as T) ?? fallback;
}

const PAID_STATUSES: OrderStatus[] = ['paid', 'confirmed', 'packed', 'shipped', 'delivered', 'refunded'];

export async function generateInvoicePdf(orderId: string): Promise<{ buffer: Buffer; filename: string }> {
  const db = getDb();

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new NotFoundError('Order');
  if (!PAID_STATUSES.includes(order.status)) {
    throw new ConflictError('An invoice is only available once payment has been received.');
  }
  if (!order.invoiceNumber) throw new ConflictError('This order does not have an invoice number yet.');

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const sellerGstin = await getSetting<string>('store.seller_gstin', '');

  const shipping = order.shippingAddress as Record<string, string>;
  const billing = order.billingAddress as Record<string, string>;
  const isIntraState = order.igst === 0;

  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const pageWidth = doc.page.width - PAGE_MARGIN * 2;

  // ---- Header -------------------------------------------------------------
  doc.fillColor(ACCENT).fontSize(20).font('Helvetica-Bold').text(STORE.name.toUpperCase(), PAGE_MARGIN, PAGE_MARGIN);
  doc.fillColor(MUTED).fontSize(8).font('Helvetica')
    .text('Professional pet grooming equipment', PAGE_MARGIN, doc.y + 2);
  if (sellerGstin) doc.text(`GSTIN: ${sellerGstin}`, { continued: false });
  doc.text(`State: ${STORE.sellerState} (${STORE.sellerStateCode})`);

  doc.fillColor(INK).fontSize(14).font('Helvetica-Bold')
    .text('TAX INVOICE', PAGE_MARGIN, PAGE_MARGIN, { width: pageWidth, align: 'right' });
  doc.fillColor(MUTED).fontSize(9).font('Helvetica')
    .text(`Invoice no.  ${order.invoiceNumber}`, { width: pageWidth, align: 'right' })
    .text(`Order no.    ${order.orderNumber}`, { width: pageWidth, align: 'right' })
    .text(`Date         ${(order.placedAt ?? order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      { width: pageWidth, align: 'right' });

  let y = Math.max(doc.y, 150) + 10;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + pageWidth, y).strokeColor(RULE).lineWidth(0.5).stroke();
  y += 16;

  // ---- Bill to / Ship to --------------------------------------------------
  const columnWidth = pageWidth / 2 - 10;
  const addressBlock = (label: string, addr: Record<string, string>, x: number, gstin?: string | null) => {
    doc.fillColor(MUTED).fontSize(7).font('Helvetica-Bold').text(label.toUpperCase(), x, y, { width: columnWidth, characterSpacing: 0.5 });
    doc.fillColor(INK).fontSize(9).font('Helvetica-Bold').text(addr.fullName ?? '', x, doc.y + 3, { width: columnWidth });
    doc.font('Helvetica').fillColor(MUTED).fontSize(8.5);
    const lines = [addr.line1, addr.line2, addr.landmark, `${addr.city ?? ''} ${addr.pincode ?? ''}`.trim(), addr.state, addr.phone]
      .filter((l): l is string => Boolean(l && l.trim()));
    for (const line of lines) doc.text(line, x, doc.y, { width: columnWidth });
    if (gstin) doc.fillColor(INK).text(`GSTIN: ${gstin}`, x, doc.y + 2, { width: columnWidth });
  };

  const startY = y;
  addressBlock('Bill to', billing, PAGE_MARGIN, order.gstin);
  const billEnd = doc.y;
  y = startY;
  addressBlock('Ship to', shipping, PAGE_MARGIN + columnWidth + 20);
  y = Math.max(billEnd, doc.y) + 18;

  // ---- Line items ---------------------------------------------------------
  const cols = { desc: PAGE_MARGIN, hsn: PAGE_MARGIN + 232, qty: PAGE_MARGIN + 286, rate: PAGE_MARGIN + 322, tax: PAGE_MARGIN + 392, total: PAGE_MARGIN + 432 };

  doc.rect(PAGE_MARGIN, y - 4, pageWidth, 18).fill('#F4F2F0');
  doc.fillColor(MUTED).fontSize(7).font('Helvetica-Bold');
  doc.text('DESCRIPTION', cols.desc + 4, y + 1);
  doc.text('HSN', cols.hsn, y + 1);
  doc.text('QTY', cols.qty, y + 1);
  doc.text('TAXABLE', cols.rate, y + 1, { width: 62, align: 'right' });
  doc.text('GST', cols.tax, y + 1, { width: 32, align: 'right' });
  doc.text('AMOUNT (INR)', cols.total, y + 1, { width: pageWidth + PAGE_MARGIN - cols.total - 4, align: 'right' });
  y += 20;

  for (const item of items) {
    if (y > doc.page.height - 220) { doc.addPage(); y = PAGE_MARGIN; }

    doc.fillColor(INK).fontSize(9).font('Helvetica-Bold').text(item.name, cols.desc + 4, y, { width: 222 });
    const afterName = doc.y;
    if (item.variantLabel) {
      doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text(item.variantLabel, cols.desc + 4, afterName, { width: 222 });
    }
    doc.fillColor(MUTED).fontSize(7.5).text(`SKU ${item.sku}`, cols.desc + 4, doc.y, { width: 222 });

    doc.fillColor(INK).fontSize(8.5).font('Helvetica');
    doc.text(item.hsnCode, cols.hsn, y);
    doc.text(String(item.quantity), cols.qty, y);
    doc.text(money(item.taxableValue), cols.rate, y, { width: 62, align: 'right' });
    doc.text(`${(item.taxRateBps / 100).toFixed(0)}%`, cols.tax, y, { width: 32, align: 'right' });
    doc.font('Helvetica-Bold').text(money(item.lineTotal - item.discountShare), cols.total, y, {
      width: pageWidth + PAGE_MARGIN - cols.total - 4, align: 'right',
    });

    y = Math.max(doc.y, y) + 10;
    doc.moveTo(PAGE_MARGIN, y - 4).lineTo(PAGE_MARGIN + pageWidth, y - 4).strokeColor(RULE).lineWidth(0.3).stroke();
  }

  // ---- Totals -------------------------------------------------------------
  y += 8;
  const labelX = PAGE_MARGIN + pageWidth - 220;
  const valueX = PAGE_MARGIN + pageWidth - 100;

  const totalRow = (label: string, value: string, opts: { bold?: boolean; accent?: boolean } = {}) => {
    doc.fillColor(opts.accent ? ACCENT : opts.bold ? INK : MUTED)
      .fontSize(opts.bold ? 10 : 8.5)
      .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(label, labelX, y, { width: 110, align: 'right' });
    doc.text(value, valueX, y, { width: 100, align: 'right' });
    y += opts.bold ? 16 : 13;
  };

  totalRow('Taxable value', money(order.taxableValue));
  if (order.discountTotal > 0) totalRow(`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, `- ${money(order.discountTotal)}`);
  if (isIntraState) {
    totalRow('CGST', money(order.cgst));
    totalRow('SGST', money(order.sgst));
  } else {
    totalRow('IGST', money(order.igst));
  }
  totalRow('Shipping', order.shippingTotal === 0 ? 'Free' : money(order.shippingTotal));

  doc.moveTo(labelX, y).lineTo(PAGE_MARGIN + pageWidth, y).strokeColor(RULE).lineWidth(0.5).stroke();
  y += 8;
  totalRow('Total (INR)', money(order.grandTotal), { bold: true, accent: true });

  // ---- Amount in words ----------------------------------------------------
  y += 6;
  doc.fillColor(MUTED).fontSize(7).font('Helvetica-Bold').text('AMOUNT IN WORDS', PAGE_MARGIN, y, { characterSpacing: 0.5 });
  doc.fillColor(INK).fontSize(9).font('Helvetica').text(amountInWords(order.grandTotal), PAGE_MARGIN, doc.y + 2, { width: pageWidth - 240 });

  // ---- Footer -------------------------------------------------------------
  const footerY = doc.page.height - 100;
  doc.moveTo(PAGE_MARGIN, footerY).lineTo(PAGE_MARGIN + pageWidth, footerY).strokeColor(RULE).lineWidth(0.5).stroke();
  doc.fillColor(MUTED).fontSize(7).font('Helvetica')
    .text('This is a computer-generated invoice and does not require a signature.', PAGE_MARGIN, footerY + 8, { width: pageWidth })
    .text(`All amounts are in Indian Rupees (INR) and inclusive of GST. Goods once delivered are subject to our returns policy. Disputes fall to the courts of Bengaluru.`,
      PAGE_MARGIN, doc.y + 2, { width: pageWidth })
    .text(`${STORE.supportEmail}   ·   ${STORE.supportPhone}`, PAGE_MARGIN, doc.y + 6, { width: pageWidth });

  doc.end();

  await new Promise<void>((resolve) => doc.on('end', () => resolve()));

  return {
    buffer: Buffer.concat(chunks),
    filename: `${order.invoiceNumber.replace(/\//g, '-')}.pdf`,
  };
}
