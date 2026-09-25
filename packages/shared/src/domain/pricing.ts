import { type Paise, sumPaise } from '../money.ts';
import { type GstBreakdown, splitInclusiveGst, DEFAULT_GST_BPS } from './gst.ts';

/**
 * The single source of truth for what an order costs.
 *
 * Checkout NEVER trusts a client-supplied price. The API rebuilds this from
 * database rows on every quote and again inside the payment transaction; the
 * browser's copy exists only to render a total the user can sanity-check.
 */

export interface PriceableLine {
  productId: string;
  variantId: string;
  categoryId: string;
  /** GST-inclusive unit price, snapshotted from the database. */
  unitPrice: Paise;
  quantity: number;
  taxRateBps: number;
  weightG: number;
}

export interface PricedLine extends PriceableLine {
  /** unitPrice × quantity, before any discount. */
  lineTotal: Paise;
  /** This line's share of the cart-level discount. */
  discountShare: Paise;
  /** lineTotal − discountShare. */
  netLineTotal: Paise;
  tax: GstBreakdown;
}

export interface OrderTotals {
  lines: PricedLine[];
  subtotal: Paise;
  discountTotal: Paise;
  shippingTotal: Paise;
  taxableValue: Paise;
  cgst: Paise;
  sgst: Paise;
  igst: Paise;
  taxTotal: Paise;
  grandTotal: Paise;
  totalWeightG: number;
  intraState: boolean;
}

/**
 * Spread a cart-level discount across lines in proportion to their value.
 *
 * Proportional allocation matters because each line may carry a different GST
 * rate: dumping the whole discount on line 1 would mis-state the tax split on
 * the invoice. The final line absorbs the rounding remainder so the shares sum
 * exactly to the discount — no stray paisa.
 */
export function allocateDiscount(lineTotals: readonly Paise[], discount: Paise): Paise[] {
  const total = sumPaise(lineTotals);
  if (total === 0 || discount === 0) return lineTotals.map(() => 0);

  const capped = Math.min(discount, total);
  const shares = lineTotals.map((lineTotal) => Math.floor((lineTotal * capped) / total));
  const allocated = sumPaise(shares);
  const remainder = capped - allocated;

  if (remainder > 0) {
    // Give the remainder to the largest line, which is the least surprising place
    // for a sub-rupee adjustment to land.
    let largestIndex = 0;
    for (let i = 1; i < lineTotals.length; i += 1) {
      if ((lineTotals[i] ?? 0) > (lineTotals[largestIndex] ?? 0)) largestIndex = i;
    }
    shares[largestIndex] = (shares[largestIndex] ?? 0) + remainder;
  }

  return shares;
}

export function priceOrder(params: {
  lines: readonly PriceableLine[];
  discount?: Paise;
  shipping?: Paise;
  buyerState?: string | null;
  /** GST rate applied to the freight component. Shipping follows the principal supply at 18%. */
  shippingTaxRateBps?: number;
}): OrderTotals {
  const { lines, discount = 0, shipping = 0, buyerState = null, shippingTaxRateBps = DEFAULT_GST_BPS } = params;

  const lineTotals = lines.map((line) => line.unitPrice * line.quantity);
  const subtotal = sumPaise(lineTotals);
  const discountShares = allocateDiscount(lineTotals, discount);
  const discountTotal = sumPaise(discountShares);

  const pricedLines: PricedLine[] = lines.map((line, index) => {
    const lineTotal = lineTotals[index] ?? 0;
    const discountShare = discountShares[index] ?? 0;
    const netLineTotal = lineTotal - discountShare;
    return {
      ...line,
      lineTotal,
      discountShare,
      netLineTotal,
      tax: splitInclusiveGst(netLineTotal, line.taxRateBps, buyerState),
    };
  });

  // Shipping is quoted GST-inclusive too, keeping one convention across the invoice.
  const shippingTax = shipping > 0 ? splitInclusiveGst(shipping, shippingTaxRateBps, buyerState) : null;

  const cgst = sumPaise(pricedLines.map((l) => l.tax.cgst)) + (shippingTax?.cgst ?? 0);
  const sgst = sumPaise(pricedLines.map((l) => l.tax.sgst)) + (shippingTax?.sgst ?? 0);
  const igst = sumPaise(pricedLines.map((l) => l.tax.igst)) + (shippingTax?.igst ?? 0);
  const taxableValue = sumPaise(pricedLines.map((l) => l.tax.taxableValue)) + (shippingTax?.taxableValue ?? 0);

  return {
    lines: pricedLines,
    subtotal,
    discountTotal,
    shippingTotal: shipping,
    taxableValue,
    cgst,
    sgst,
    igst,
    taxTotal: cgst + sgst + igst,
    grandTotal: subtotal - discountTotal + shipping,
    totalWeightG: lines.reduce((sum, line) => sum + line.weightG * line.quantity, 0),
    intraState: pricedLines[0]?.tax.intraState ?? shippingTax?.intraState ?? false,
  };
}
