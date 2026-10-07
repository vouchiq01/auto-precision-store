'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatINR, ORDER_STATUS_LABELS, type Order } from '@aps/shared';
import { apiFetch, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { ListingHero } from '@/components/collection/listing-hero';
import { OrderProgress } from '@/components/order/order-progress';
import { Badge, Spinner } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';

export default function OrderPage() {
  const params = useParams<{ orderNumber: string }>();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const paymentUnavailable = searchParams.get('payment') === 'unavailable';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await apiFetch<Order>(`/api/checkout/orders/${params.orderNumber}`);
        if (!cancelled) setOrder(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load that order.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    /* The webhook confirms payment asynchronously and may land a second or two
       after the browser callback. Poll briefly so the page flips to "paid"
       without the customer refreshing and worrying. */
    const poll = setInterval(() => { void load(); }, 4000);
    const stop = setTimeout(() => clearInterval(poll), 30_000);

    return () => { cancelled = true; clearInterval(poll); clearTimeout(stop); };
  }, [params.orderNumber]);

  if (loading) {
    return <div className="shell grid min-h-[50vh] place-items-center pt-28"><Spinner className="text-muted" /></div>;
  }

  if (error || !order) {
    return (
      <>
        <ListingHero crumb="Order" title="Order not found" description={error ?? 'We could not find that order number.'} />
        <div className="shell py-10">
          <ButtonLink href="/shop" variant="secondary">Back to the store</ButtonLink>
        </div>
      </>
    );
  }

  const cancelled = order.status === 'cancelled';
  const paid = order.status !== 'pending_payment' && !cancelled;

  const address = order.shippingAddress;

  return (
    <>
      <ListingHero
        crumb="Order"
        title={cancelled ? 'This order was cancelled' : paid ? 'Thank you — we have your order' : 'Awaiting payment'}
        description={<span className="numeric">Order {order.orderNumber}</span>}
      />

      <div className="shell pb-14 pt-6 md:pt-8">
        {paymentUnavailable && !paid && (
          <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/5 p-5">
            <p className="text-sm text-warning">
              Your order is saved and the stock is held, but the payment window could not be opened.
              Please contact us and we will send you a payment link.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8">
          <div className="space-y-6">
            {/* Where it is, and how to follow it. */}
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card md:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={paid ? 'success' : 'warning'}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                {order.trackingNumber && (
                  order.trackingUrl ? (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="numeric text-sm text-muted underline-offset-4 transition-colors hover:text-crimson hover:underline"
                    >
                      {order.carrier ? `${order.carrier} · ` : ''}Tracking {order.trackingNumber} ↗
                    </a>
                  ) : (
                    <span className="numeric text-sm text-muted">
                      {order.carrier ? `${order.carrier} · ` : ''}Tracking {order.trackingNumber}
                    </span>
                  )
                )}
              </div>
              <OrderProgress status={order.status} className="mt-6" />
            </section>

            <section className="rounded-2xl border border-line bg-surface shadow-card" aria-label="Items in this order">
              <ul className="divide-y divide-line">
                {order.lines.map((line) => (
                  <li key={line.id} className="flex items-center gap-4 p-4 sm:p-5">
                    <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-sand sm:size-24">
                      {line.imageUrl && <Image src={line.imageUrl} alt="" fill sizes="96px" className="object-cover" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/products/${line.productSlug}`} className="font-medium text-content transition-colors hover:text-crimson">
                        {line.name}
                      </Link>
                      <p className="text-sm text-muted">{line.variantLabel}</p>
                      <p className="numeric mt-0.5 text-xs text-faint">SKU {line.sku} · Qty {line.quantity}</p>
                    </div>
                    <p className="numeric shrink-0 font-semibold text-content">{formatINR(line.lineTotal)}</p>
                  </li>
                ))}
              </ul>
            </section>

            {order.events.length > 0 && (
              <section className="rounded-2xl border border-line bg-surface p-5 shadow-card md:p-6">
                <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-content">Timeline</h2>
                <ol className="mt-5 space-y-5 border-l border-line pl-5">
                  {order.events.map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute -left-[1.6875rem] top-1.5 size-2.5 rounded-full bg-crimson ring-4 ring-surface" aria-hidden="true" />
                      <p className="text-sm font-medium text-content">{ORDER_STATUS_LABELS[event.status]}</p>
                      {event.note && <p className="text-sm text-muted">{event.note}</p>}
                      <p className="text-xs text-faint">{formatDateTime(event.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-32">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card md:p-6">
              <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-content">Summary</h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="numeric text-content">{formatINR(order.subtotal)}</dd></div>
                {order.discountTotal > 0 && (
                  <div className="flex justify-between text-success"><dt>Discount</dt><dd className="numeric">− {formatINR(order.discountTotal)}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-muted">Freight</dt><dd className="numeric text-content">{order.shippingTotal === 0 ? 'Free' : formatINR(order.shippingTotal)}</dd></div>
                {order.igst > 0
                  ? <div className="flex justify-between text-xs text-faint"><dt>IGST</dt><dd className="numeric">{formatINR(order.igst)}</dd></div>
                  : <>
                      <div className="flex justify-between text-xs text-faint"><dt>CGST</dt><dd className="numeric">{formatINR(order.cgst)}</dd></div>
                      <div className="flex justify-between text-xs text-faint"><dt>SGST</dt><dd className="numeric">{formatINR(order.sgst)}</dd></div>
                    </>}
                <div className="flex justify-between border-t border-line pt-3 text-base">
                  <dt className="font-semibold text-content">Total</dt>
                  <dd className="numeric font-semibold text-content">{formatINR(order.grandTotal)}</dd>
                </div>
              </dl>

              {order.gstin && <p className="numeric mt-4 text-xs text-faint">GSTIN {order.gstin}</p>}

              <div className="mt-5 border-t border-line pt-5 text-sm">
                <h3 className="eyebrow mb-2">Delivering to</h3>
                <address className="not-italic leading-relaxed text-muted">
                  {String(address.fullName ?? '')}<br />
                  {String(address.line1 ?? '')}<br />
                  {address.line2 ? <>{String(address.line2)}<br /></> : null}
                  {String(address.city ?? '')} {String(address.pincode ?? '')}<br />
                  {String(address.state ?? '')}
                </address>
              </div>

              <ButtonLink href="/account" variant="secondary" className="mt-6 w-full">Your orders</ButtonLink>
              <ButtonLink href="/shop" variant="ghost" className="mt-2 w-full">Keep shopping</ButtonLink>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
