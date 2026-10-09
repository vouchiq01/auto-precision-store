'use client';

import { useMemo, useState } from 'react';
import { emiOptions, formatINR, type ProductDetail, type ProductVariant } from '@aps/shared';
import { cn } from '@/lib/cn';
import { addErrorMessage, flyToCart, showCartMessage } from '@/lib/fly-to-cart';
import { useCart } from '@/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Badge, Eyebrow } from '@/components/ui/primitives';
import { PincodeCheck } from './pincode-check';
import { StockNotify } from './stock-notify';

export function BuyBox({ product }: { product: ProductDetail }) {
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState(
    // Default to the first variant that is actually buyable, not simply the first.
    () => product.variants.find((v) => v.inStock)?.id ?? product.variants[0]?.id ?? '',
  );
  const [showEmi, setShowEmi] = useState(false);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);

  const variant = useMemo<ProductVariant | undefined>(
    () => product.variants.find((v) => v.id === variantId),
    [product.variants, variantId],
  );

  const price = variant?.price ?? product.price;
  const compareAt = variant?.compareAtPrice ?? product.compareAtPrice;
  const plans = useMemo(() => emiOptions(price), [price]);

  async function onAdd() {
    if (!variant || adding) return;
    setAdding(true);
    /* Optimistic: fly and confirm at once; undo and explain if the server refuses. */
    flyToCart(document.querySelector('[data-fly-source]'), document.querySelector('[data-add-to-cart]'));
    setAdded(true);
    try {
      await addItem(variant.id, 1);
      setTimeout(() => setAdded(false), 2200);
    } catch (error) {
      setAdded(false);
      showCartMessage(addErrorMessage(error));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <Eyebrow>{product.category.name}</Eyebrow>
        <h1 className="display-md mt-3 text-content">{product.name}</h1>
        {product.tagline && <p className="mt-3 text-lg text-muted">{product.tagline}</p>}

        {product.badges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {product.badges.map((badge) => <Badge key={badge} tone="accent">{badge}</Badge>)}
          </div>
        )}
      </div>

      {product.summary && <p className="leading-relaxed text-muted">{product.summary}</p>}

      {/* Price */}
      <div className="rule pt-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="numeric font-display text-4xl font-semibold tracking-[-0.03em] text-content">
            {formatINR(price)}
          </span>
          {compareAt && compareAt > price && (
            <>
              <span className="numeric text-lg text-faint line-through">{formatINR(compareAt)}</span>
              <span className="numeric rounded-full bg-crimson px-2.5 py-1 text-xs font-medium text-white">
                Save {formatINR(compareAt - price)}
              </span>
            </>
          )}
        </div>
        <p className="mt-1.5 text-xs text-faint">
          Inclusive of {product.taxRateBps / 100}% GST · HSN {product.hsnCode}
        </p>

        {plans.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowEmi((v) => !v)}
              aria-expanded={showEmi}
              className="numeric text-sm text-content underline decoration-faint underline-offset-4 transition-colors hover:decoration-bone"
            >
              or from {formatINR(Math.min(...plans.map((p) => p.monthlyAmount)))}/mo on EMI
            </button>

            {showEmi && (
              <div className="mt-3 overflow-hidden rounded-xl border border-line">
                <table className="w-full text-sm">
                  <caption className="sr-only">EMI options for {product.name}</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-faint">
                      <th scope="col" className="px-4 py-2.5 font-normal">Tenure</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-normal">Per month</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-normal">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {plans.map((plan) => (
                      <tr key={plan.months}>
                        <td className="numeric px-4 py-2.5 text-muted">{plan.months} months</td>
                        <td className="numeric px-4 py-2.5 text-right text-content">{formatINR(plan.monthlyAmount)}</td>
                        <td className="numeric px-4 py-2.5 text-right text-muted">{formatINR(plan.totalPayable)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t border-line px-4 py-2.5 text-xs text-faint">
                  Indicative only. Your bank sets the final rate and eligibility at checkout.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Variants */}
      {product.variants.length > 1 && (
        <fieldset className="rule pt-6">
          <legend className="eyebrow mb-3">
            {product.variants[0]?.optionName ?? 'Option'}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((option) => {
              const selected = option.id === variantId;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setVariantId(option.id)}
                  disabled={!option.inStock}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-all duration-300',
                    selected
                      ? 'border-line-strong bg-surface text-content'
                      : 'border-line text-muted hover:border-muted',
                    !option.inStock && 'cursor-not-allowed opacity-40 line-through',
                  )}
                >
                  {option.hexColour && (
                    <span
                      className="size-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: option.hexColour }}
                      aria-hidden="true"
                    />
                  )}
                  {option.optionValue}
                  {option.price !== product.price && (
                    <span className="numeric text-xs opacity-70">
                      {option.price > product.price ? '+' : '−'}
                      {formatINR(Math.abs(option.price - product.price))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Stock + add to cart */}
      <div className="space-y-3">
        {variant && variant.inStock ? (
          <>
            {variant.isLowStock && (
              <p className="numeric text-sm text-warning">
                Only {variant.stockQty} left in {variant.optionValue.toLowerCase()}.
              </p>
            )}
            <Button
              size="lg"
              magnetic
              onClick={() => void onAdd()}
              className="w-full"
              data-add-to-cart
            >
              {added ? 'Added to cart ✓' : 'Add to cart'}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-warning">
              This option is out of stock. Tell us where to reach you and we will let you know the moment it lands.
            </p>
            {variant && <StockNotify variantId={variant.id} />}
          </>
        )}
      </div>

      <PincodeCheck />

      {/* Reassurance */}
      <ul className="rule grid gap-3 pt-6 text-sm text-muted">
        <li className="flex gap-3">
          <span aria-hidden="true" className="text-crimson">—</span>
          {product.warrantyMonths} month frame warranty, 12 months on electrical parts
        </li>
        <li className="flex gap-3">
          <span aria-hidden="true" className="text-crimson">—</span>
          GST invoice with your GSTIN, generated automatically
        </li>
        <li className="flex gap-3">
          <span aria-hidden="true" className="text-crimson">—</span>
          Crated and tracked from our Bengaluru warehouse
        </li>
      </ul>
    </div>
  );
}
