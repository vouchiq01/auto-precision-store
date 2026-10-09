'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { emiOptions, formatINR, type ProductDetail, type ProductVariant } from '@aps/shared';
import { cn } from '@/lib/cn';
import { addErrorMessage, flyToCart, showCartMessage } from '@/lib/fly-to-cart';
import { usePublicCoupons } from '@/hooks/use-public-coupons';
import { couponLine } from '@/lib/coupon-display';
import { useCart } from '@/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Badge, Eyebrow } from '@/components/ui/primitives';
import { PincodeCheck } from './pincode-check';
import { ProductTag, tagFor } from './product-tag';
import { Stars } from './stars';
import { StockNotify } from './stock-notify';

export function BuyBox({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { addItem } = useCart();
  const coupons = usePublicCoupons();
  const [buying, setBuying] = useState(false);
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

  /* "Buy now": add this finish, then go straight to checkout. The cart is the source of truth, so
     the quote, freight and sign-in step there are exactly what an ordinary add would give. */
  async function onBuyNow() {
    if (!variant || buying) return;
    setBuying(true);
    try {
      await addItem(variant.id, 1);
      router.push('/checkout');
    } catch (error) {
      showCartMessage(addErrorMessage(error));
      setBuying(false);
    }
  }

  const { dimensions: d } = product;
  const facts = [
    d.loadCapacityKg ? { label: 'Holds up to', value: `${d.loadCapacityKg} kg` } : null,
    d.heightMinMm && d.heightMaxMm ? { label: 'Working height', value: `${Math.round(d.heightMinMm / 10)}–${Math.round(d.heightMaxMm / 10)} cm` } : null,
    d.lengthMm && d.widthMm ? { label: 'Deck size', value: `${Math.round(d.lengthMm / 10)} × ${Math.round(d.widthMm / 10)} cm` } : null,
    product.warrantyMonths ? { label: 'Warranty', value: `${product.warrantyMonths} months` } : null,
  ].filter((f): f is { label: string; value: string } => Boolean(f));

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Eyebrow>{product.category.name}</Eyebrow>
          {product.badges.length > 0 && (
            <span className="flex flex-wrap gap-1.5">
              {product.badges.map((badge) => {
                const tag = tagFor(badge);
                return tag ? <ProductTag key={badge} tag={tag} /> : <Badge key={badge} tone="accent">{badge}</Badge>;
              })}
            </span>
          )}
        </div>
        <h1 className="mt-2.5 font-display text-[1.625rem] font-semibold leading-[1.08] tracking-[-0.03em] text-content sm:text-4xl">{product.name}</h1>
        {product.tagline && <p className="mt-1.5 text-[0.9375rem] text-muted sm:mt-2 sm:text-lg">{product.tagline}</p>}

        {/* Stars, average and a link down to the reviews. Published reviews only. */}
        <div className="numeric mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:mt-4">
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
      </div>

      {/* The summary repeats what the page says further down; on a phone it would push the price off the first screen. */}
      {product.summary && <p className="hidden leading-relaxed text-muted sm:block">{product.summary}</p>}

      {/* Price card */}
      <div className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-line sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="numeric font-display text-[2rem] font-semibold leading-none tracking-[-0.03em] text-content sm:text-4xl">
            {formatINR(price)}
          </span>
          {compareAt && compareAt > price && (
            <>
              <span className="numeric rounded-full bg-success px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                {Math.round(((compareAt - price) / compareAt) * 100)}% off
              </span>
              <span className="numeric text-base text-faint line-through">{formatINR(compareAt)}</span>
            </>
          )}
        </div>
        {compareAt && compareAt > price && (
          <p className="numeric mt-2 text-sm font-medium text-success">You save {formatINR(compareAt - price)}</p>
        )}
        <p className="mt-1.5 text-xs text-faint">Inclusive of {product.taxRateBps / 100}% GST · HSN {product.hsnCode}</p>

        {plans.length > 0 && (
          <div className="mt-3 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setShowEmi((v) => !v)}
              aria-expanded={showEmi}
              className="numeric flex w-full cursor-pointer items-center justify-between gap-3 text-left text-sm text-content"
            >
              <span>
                EMI from <span className="font-semibold">{formatINR(Math.min(...plans.map((p) => p.monthlyAmount)))}/mo</span>
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-crimson">
                {showEmi ? 'Hide plans' : 'View plans'}
                <svg viewBox="0 0 12 12" className={cn('size-3 transition-transform', showEmi && 'rotate-180')} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" /></svg>
              </span>
            </button>

            {showEmi && (
              <div className="mt-3 overflow-hidden rounded-xl border border-line">
                <table className="w-full text-sm">
                  <caption className="sr-only">EMI options for {product.name}</caption>
                  <thead>
                    <tr className="border-b border-line bg-canvas text-left text-xs text-faint">
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

      {/* At a glance: only the figures this product really has. */}
      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-xl bg-sand px-3 py-2.5">
              <dt className="text-[0.6875rem] text-muted">{fact.label}</dt>
              <dd className="numeric mt-0.5 text-sm font-semibold text-content">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Variants */}
      {product.variants.length > 1 && (
        <fieldset>
          <legend className="mb-2.5 text-sm font-medium text-content">
            {product.variants[0]?.optionName ?? 'Option'}: <span className="text-muted">{variant?.optionValue}</span>
          </legend>
          <div className="flex flex-wrap gap-2.5">
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
                    'flex min-w-[7.5rem] cursor-pointer items-center gap-2.5 rounded-xl border-2 bg-surface px-3.5 py-2.5 text-left text-sm transition-all duration-200',
                    selected ? 'border-crimson shadow-card' : 'border-line hover:border-line-strong',
                    !option.inStock && 'cursor-not-allowed opacity-45',
                  )}
                >
                  {option.hexColour && (
                    <span className="size-5 shrink-0 rounded-full border border-black/15" style={{ backgroundColor: option.hexColour }} aria-hidden="true" />
                  )}
                  <span className="min-w-0">
                    <span className={cn('block font-medium', !option.inStock && 'line-through')}>{option.optionValue}</span>
                    {option.price !== product.price ? (
                      <span className="numeric block text-xs text-muted">{option.price > product.price ? '+' : '−'}{formatINR(Math.abs(option.price - product.price))}</span>
                    ) : !option.inStock ? (
                      <span className="block text-xs text-warning">Sold out</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Add to cart / Buy now */}
      <div className="space-y-3">
        {variant && variant.inStock ? (
          <>
            {variant.isLowStock && (
              <p className="numeric flex items-center gap-2 text-sm font-medium text-crimson">
                <span className="size-1.5 rounded-full bg-crimson" aria-hidden="true" />
                Only {variant.stockQty} left in {variant.optionValue.toLowerCase()}.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" magnetic onClick={() => void onAdd()} className="w-full" data-add-to-cart>
                {added ? 'Added ✓' : 'Add to cart'}
              </Button>
              <button
                type="button"
                onClick={() => void onBuyNow()}
                disabled={buying}
                className="inline-flex h-[3.25rem] w-full cursor-pointer items-center justify-center rounded-full bg-ink px-5 text-[0.9375rem] font-semibold text-on-ink transition-colors hover:bg-ink-raised disabled:opacity-70"
              >
                {buying ? 'Going to checkout…' : 'Buy now'}
              </button>
            </div>
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

      {/* Delivery */}
      <section aria-label="Delivery" className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-content">
          <TrustIcon name="truck" small /> Delivery
        </h2>
        <PincodeCheck />
        <ul className="mt-3 grid gap-1.5 text-xs text-muted">
          <li className="flex gap-2"><span aria-hidden="true" className="text-crimson">✓</span>Crated and tracked from our Bengaluru warehouse</li>
          <li className="flex gap-2"><span aria-hidden="true" className="text-crimson">✓</span>GST invoice with your GSTIN, generated automatically</li>
        </ul>
      </section>

      {/* Offers: the codes the owner has published, nothing invented. */}
      {coupons && coupons.length > 0 && (
        <section aria-label="Available offers" className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
          <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-content">
            <svg viewBox="0 0 20 20" className="size-4 text-crimson" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 10.500V4a1 1 0 0 1 1-1h6.500l6.800 6.800a1 1 0 0 1 0 1.400l-5.100 5.100a1 1 0 0 1-1.400 0L3 10.500z" /><circle cx="7" cy="7" r="1.200" fill="currentColor" stroke="none" />
            </svg>
            Available offers
          </h2>
          <ul className="grid gap-2 text-[0.8125rem] text-muted">
            {coupons.map((coupon) => (
              <li key={coupon.code} className="flex items-start gap-2">
                <span className="numeric shrink-0 rounded-md bg-crimson-tint px-1.5 py-0.5 text-[0.6875rem] font-bold tracking-wide text-crimson">{coupon.code}</span>
                <span>{couponLine(coupon).replace(`Use ${coupon.code} for `, '')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* What stands behind the purchase. Each line is true of every product: we
          deliver across India, pay through Razorpay, and the warranty is the
          product's own. */}
      <ul className="grid grid-cols-3 gap-2" aria-label="Why buy from us">
        {[
          { icon: 'factory', label: 'Direct from manufacturer' },
          { icon: 'return', label: 'Easy returns', href: '/pages/returns' },
          { icon: 'lock', label: 'Secure payment' },
          { icon: 'truck', label: 'Pan India shipping', href: '/pages/shipping' },
          { icon: 'shield', label: `${product.warrantyMonths} month warranty` },
          { icon: 'chat', label: 'Expert support', href: '/enquiry' },
        ].map((tile) => {
          const inner = (
            <>
              <TrustIcon name={tile.icon} />
              <span className="text-[0.6875rem] font-medium leading-tight text-content sm:text-xs">{tile.label}</span>
            </>
          );
          const box = 'flex h-full flex-col items-center justify-center gap-1.5 rounded-xl bg-sand px-1.5 py-3 text-center transition-colors';
          return (
            <li key={tile.label}>
              {tile.href
                ? <a href={tile.href} className={`${box} hover:bg-line`}>{inner}</a>
                : <div className={box}>{inner}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TrustIcon({ name, small = false }: { name: string; small?: boolean }) {
  const paths: Record<string, React.ReactNode> = {
    factory: <><path d="M3 18V9l5 3V9l5 3V5h4v13z" /><path d="M7 15h1M11 15h1M15 15h1" /></>,
    return: <><path d="M5 8h9a4 4 0 0 1 0 8H8" /><path d="M8 5L5 8l3 3" /></>,
    lock: <><rect x="4.5" y="9" width="11" height="8" rx="1.5" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></>,
    truck: <><path d="M2.5 6h9v8h-9zM11.5 9h3l2.5 2.5V14h-5.5z" /><circle cx="6" cy="15" r="1.4" /><circle cx="14" cy="15" r="1.4" /></>,
    shield: <><path d="M10 2.5l6 2v5c0 4-2.6 6.4-6 8-3.4-1.6-6-4-6-8v-5z" /><path d="M7.3 10l2 2 3.5-4" /></>,
    chat: <><path d="M3.5 5.5h13v8h-6l-3.5 3v-3h-3.5z" /><path d="M7 9h6" /></>,
  };
  return (
    <svg viewBox="0 0 20 20" className={small ? 'size-4 text-crimson' : 'size-6 text-crimson'} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
