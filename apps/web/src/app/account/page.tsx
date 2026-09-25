'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatINR, ORDER_STATUS_LABELS, type Order, type Paginated } from '@aps/shared';
import { apiFetch, API_URL } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { Badge, EmptyState, Eyebrow, Spinner } from '@/components/ui/primitives';
import { Button, ButtonLink } from '@/components/ui/button';

export default function AccountPage() {
  const { user, token, loading: authLoading, logout } = useAuth();
  const [orders, setOrders] = useState<Paginated<Order> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !token) { setLoading(false); return; }
    void apiFetch<Paginated<Order>>('/api/account/orders', { token })
      .then(setOrders)
      .catch(() => setOrders(null))
      .finally(() => setLoading(false));
  }, [authLoading, token]);

  if (authLoading || loading) {
    return <div className="shell grid min-h-[50vh] place-items-center pt-28"><Spinner className="text-muted" /></div>;
  }

  if (!user) {
    return (
      <div className="shell pt-28 md:pt-36">
        <Eyebrow>Account</Eyebrow>
        <h1 className="display-lg mt-4 text-content">Not signed in<span className="text-crimson">.</span></h1>
        <p className="lede mt-5">
          Sign in with your phone number to see your orders, addresses and invoices.
        </p>
        <ButtonLink href="/" className="mt-8">Back to the store</ButtonLink>
      </div>
    );
  }

  return (
    <div className="shell pt-28 md:pt-36">
      <Eyebrow>Account</Eyebrow>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <h1 className="display-lg text-content">
          {user.fullName?.split(' ')[0] ?? 'Hello'}<span className="text-crimson">.</span>
        </h1>
        <Button variant="ghost" size="sm" onClick={() => void logout()}>Sign out</Button>
      </div>

      <p className="numeric mt-3 text-sm text-muted">{user.phone}</p>

      <section className="mt-16">
        <h2 className="eyebrow mb-6">Your orders</h2>

        {!orders || orders.items.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="When you buy a table it will appear here, with its invoice and tracking."
            action={<ButtonLink href="/collections/electric-lifting" variant="secondary">Browse tables</ButtonLink>}
          />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {orders.items.map((order) => {
              const invoiceAvailable = order.status !== 'pending_payment' && order.status !== 'cancelled';
              return (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
                  <div className="min-w-0">
                    <Link href={`/order/${order.orderNumber}`} className="numeric font-medium text-content transition-colors hover:text-crimson">
                      {order.orderNumber}
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      {order.lines.length} {order.lines.length === 1 ? 'item' : 'items'} · {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge tone={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'warning' : 'neutral'}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                    <span className="numeric text-content">{formatINR(order.grandTotal)}</span>
                    {invoiceAvailable && (
                      <a
                        href={`${API_URL}/api/account/orders/${order.orderNumber}/invoice`}
                        className="text-sm text-muted underline-offset-4 transition-colors hover:text-content hover:underline"
                      >
                        Invoice
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
