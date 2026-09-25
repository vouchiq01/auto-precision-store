'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatINR, ORDER_STATUS_LABELS, type Order } from '@aps/shared';
import { apiFetch, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Badge, Eyebrow, Spinner } from '@/components/ui/primitives';
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
    return <div className="shell grid min-h-[50vh] place-items-center pt-28"><Spinner className="text-steel" /></div>;
  }

  if (error || !order) {
    return (
      <div className="shell pt-28 md:pt-36">
        <h1 className="display-md text-bone">Order not found</h1>
        <p className="lede mt-4">{error ?? 'We could not find that order number.'}</p>
        <ButtonLink href="/" variant="secondary" className="mt-8">Back to the store</ButtonLink>
      </div>
    );
  }

  const paid = order.status !== 'pending_payment' && order.status !== 'cancelled';

  return (
    <div className="shell pt-28 md:pt-36">
      <Eyebrow>{paid ? 'Thank you' : 'Order created'}</Eyebrow>
      <h1 className="display-lg mt-4 text-bone">
        {paid ? 'We have your order' : 'Awaiting payment'}
        <span className="text-crimson">.</span>
      </h1>
      <p className="numeric lede mt-5">Order {order.orderNumber}</p>

      {paymentUnavailable && !paid && (
        <div className="mt-8 rounded-2xl border border-warning/30 bg-warning/5 p-5">
          <p className="text-sm text-warning">
            Your order is saved and the stock is held, but the payment window could not be opened.
            Please contact us and we will send you a payment link.
          </p>
        </div>
      )}

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <div>
          <div className="flex items-center gap-3">
            <Badge tone={paid ? 'success' : 'warning'}>{ORDER_STATUS_LABELS[order.status]}</Badge>
            {order.trackingNumber && (
              <span className="numeric text-sm text-steel">Tracking {order.trackingNumber}</span>
            )}
          </div>

          <ul className="mt-8 divide-y divide-ink-line border-y border-ink-line">
            {order.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-4 py-5">
                <div className="min-w-0">
                  <Link href={`/products/${line.productSlug}`} className="font-medium text-bone transition-colors hover:text-white">
                    {line.name}
                  </Link>
                  <p className="text-sm text-steel">{line.variantLabel}</p>
                  <p className="numeric text-xs text-steel-dim">SKU {line.sku} · Qty {line.quantity}</p>
                </div>
                <p className="numeric shrink-0 text-bone">{formatINR(line.lineTotal)}</p>
              </li>
            ))}
          </ul>

          {order.events.length > 0 && (
            <section className="mt-12">
              <h2 className="eyebrow mb-5">Timeline</h2>
              <ol className="space-y-4">
                {order.events.map((event) => (
                  <li key={event.id} className="flex gap-4">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-crimson" aria-hidden="true" />
                    <div>
                      <p className="text-sm text-bone">{ORDER_STATUS_LABELS[event.status]}</p>
                      {event.note && <p className="text-sm text-steel">{event.note}</p>}
                      <p className="text-xs text-steel-dim">{formatDateTime(event.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside>
          <div className="rounded-2xl border border-ink-line p-6">
            <h2 className="eyebrow mb-5">Summary</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-steel">Subtotal</dt><dd className="numeric text-bone">{formatINR(order.subtotal)}</dd></div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between text-success"><dt>Discount</dt><dd className="numeric">− {formatINR(order.discountTotal)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-steel">Freight</dt><dd className="numeric text-bone">{order.shippingTotal === 0 ? 'Free' : formatINR(order.shippingTotal)}</dd></div>
              {order.igst > 0
                ? <div className="flex justify-between text-xs text-steel-dim"><dt>IGST</dt><dd className="numeric">{formatINR(order.igst)}</dd></div>
                : <>
                    <div className="flex justify-between text-xs text-steel-dim"><dt>CGST</dt><dd className="numeric">{formatINR(order.cgst)}</dd></div>
                    <div className="flex justify-between text-xs text-steel-dim"><dt>SGST</dt><dd className="numeric">{formatINR(order.sgst)}</dd></div>
                  </>}
              <div className="rule flex justify-between pt-3 text-base">
                <dt className="font-medium text-bone">Total</dt>
                <dd className="numeric font-medium text-bone">{formatINR(order.grandTotal)}</dd>
              </div>
            </dl>

            {order.gstin && <p className="numeric mt-4 text-xs text-steel-dim">GSTIN {order.gstin}</p>}

            <div className="rule mt-6 pt-5 text-sm">
              <h3 className="eyebrow mb-2">Delivering to</h3>
              <address className="not-italic leading-relaxed text-steel">
                {String(order.shippingAddress.fullName ?? '')}<br />
                {String(order.shippingAddress.line1 ?? '')}<br />
                {order.shippingAddress.line2 ? <>{String(order.shippingAddress.line2)}<br /></> : null}
                {String(order.shippingAddress.city ?? '')} {String(order.shippingAddress.pincode ?? '')}<br />
                {String(order.shippingAddress.state ?? '')}
              </address>
            </div>

            <ButtonLink href="/account" variant="secondary" className="mt-6 w-full">Your orders</ButtonLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
