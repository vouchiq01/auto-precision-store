import { formatINR, type CartSummary } from '@aps/shared';
import { cn } from '@/lib/cn';

/** Subtotal, discount, the freight note and the total — one source for page and drawer. */
export function CartTotals({ cart, compact = false }: { cart: CartSummary | null; compact?: boolean }) {
  const discount = cart?.discountTotal ?? 0;

  return (
    <div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="numeric text-content">{formatINR(cart?.subtotal ?? 0)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-success">
            <dt>Discount</dt>
            <dd className="numeric">− {formatINR(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted">Freight</dt>
          <dd className="text-faint">Calculated at checkout</dd>
        </div>
        <div className={cn('flex items-baseline justify-between border-t border-line pt-3', compact ? 'text-base' : 'text-lg')}>
          <dt className="font-medium text-content">Total</dt>
          <dd className="numeric font-semibold text-content">{formatINR(cart?.estimatedTotal ?? 0)}</dd>
        </div>
      </dl>
      <p className="mt-1.5 text-xs text-faint">Inclusive of GST. Freight is added once we have your pincode.</p>
    </div>
  );
}
