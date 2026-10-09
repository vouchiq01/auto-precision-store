'use client';

import { useMemo, useState } from 'react';
import { emiOptions, formatINR, type ProductDetail, type ProductVariant } from '@aps/shared';
import { cn } from '@/lib/cn';
import { addErrorMessage, flyToCart, showCartMessage } from '@/lib/fly-to-cart';
import { useCart } from '@/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Badge, Eyebrow } from '@/components/ui/primitives';
import { PincodeCheck } from './pincode-check';
import { Stars } from './stars';
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

        {/* Stars, average and a link down to the reviews. Published reviews only. */}
        <div className="numeric mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {product.rating ? (
            <a href="#reviews" className="flex items-center gap-2 text-muted hover:text-content">
              <Stars value={product.rating.average} size="md" />
              <span className="font-semibold text-content">{product.rating.average.toFixed(1)}</span>
              <span className="underline decoration-line-strong underline-offset-4">({product.rating.count} {product.rating.count === 1 ? 'review' : 'reviews'})</span>
            </a>
          ) : (
            <a href="#reviews" className="flex items-center gap-2 text-faint hover:text-muted">
              <Stars value={0} size="md" />
              <span>No reviews yet</span>
            </a>
          )}
          {variant && (
            <span className={cn('flex items-center gap-1.5 font-medium', variant.inStock ? 'text-success' : 'text-warning')}>
              <span className="size-2 rounded-full bg-current" aria-hidden="true" />
              {variant.inStock ? 'In stock' : 'Out of stock'}
            </span>
          )}
        </div>

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
              <span className="numeric rounded-full bg-crimson px-2.5 py-1 text-xs font-semibold uppercase text-white">
                {Math.round(((compareAt - price) / compareAt) * 100)}% off
              </span>
              <span className="numeric text-sm font-medium text-success">You save {formatINR(compareAt - price)}</span>
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

      {/* What stands behind the purchase. Each line is true of every product: we
          deliver across India, pay through Razorpay, and the warranty is the
          product's own. */}
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" aria-label="Why buy from us">
        {[
          { icon: 'factory', label: 'Direct from manufacturer' },
          { icon: 'return', label: 'Easy returns policy', href: '/pages/returns' },
          { icon: 'lock', label: 'Secure payment' },
          { icon: 'truck', label: 'Pan India shipping', href: '/pages/shipping' },
          { icon: 'shield', label: `${product.warrantyMonths} month warranty` },
          { icon: 'chat', label: 'Expert support', href: '/enquiry' },
        ].map((tile) => {
          const inner = (
            <>
              <TrustIcon name={tile.icon} />
              <span className="text-[0.8125rem] font-medium leading-tight text-content">{tile.label}</span>
            </>
          );
          const box = 'flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface px-2 py-4 text-center transition-colors';
          return (
            <li key={tile.label}>
              {tile.href
                ? <a href={tile.href} className={`${box} hover:border-line-strong`}>{inner}</a>
                : <div className={box}>{inner}</div>}
            </li>
          );
        })}
      </ul>

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

function TrustIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    factory: <><path d="M3 18V9l5 3V9l5 3V5h4v13z" /><path d="M7 15h1M11 15h1M15 15h1" /></>,
    return: <><path d="M5 8h9a4 4 0 0 1 0 8H8" /><path d="M8 5L5 8l3 3" /></>,
    lock: <><rect x="4.5" y="9" width="11" height="8" rx="1.5" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></>,
    truck: <><path d="M2.5 6h9v8h-9zM11.5 9h3l2.5 2.5V14h-5.5z" /><circle cx="6" cy="15" r="1.4" /><circle cx="14" cy="15" r="1.4" /></>,
    shield: <><path d="M10 2.5l6 2v5c0 4-2.6 6.4-6 8-3.4-1.6-6-4-6-8v-5z" /><path d="M7.3 10l2 2 3.5-4" /></>,
    chat: <><path d="M3.5 5.5h13v8h-6l-3.5 3v-3h-3.5z" /><path d="M7 9h6" /></>,
  };
  return (
    <svg viewBox="0 0 20 20" className="size-7 text-crimson" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
