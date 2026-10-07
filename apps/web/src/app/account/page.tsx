'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  formatINR, ORDER_STATUS_LABELS, type Address, type Order, type Paginated,
} from '@aps/shared';
import { apiFetch, API_URL } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { useSignIn } from '@/providers/sign-in-provider';
import { ListingHero } from '@/components/collection/listing-hero';
import { OrderProgress } from '@/components/order/order-progress';
import { Badge, Spinner } from '@/components/ui/primitives';
import { Button, ButtonLink } from '@/components/ui/button';

/**
 * The account.
 *
 * Two things were wrong with the first version. The customer's first name ran
 * at display-lg, which is a size reserved for a page's argument — on a name
 * it is merely loud, and on a half-typed one it is comic. And the address book
 * was missing entirely, which was honest in a way: nothing was ever written to
 * it, because an order snapshots its own copy of the address. Checkout now
 * remembers the address as well as snapshotting it, so there is something here
 * to show, and a second table does not mean retyping the whole form.
 */
export default function AccountPage() {
  const { user, token, loading: authLoading, logout } = useAuth();
  const { openSignIn } = useSignIn();
  const [orders, setOrders] = useState<Paginated<Order> | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAddressId, setBusyAddressId] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    if (!token) return;
    try {
      const result = await apiFetch<{ items: Address[] }>('/api/account/addresses', { token });
      setAddresses(result.items);
    } catch {
      setAddresses([]);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading || !token) { setLoading(false); return; }
    void Promise.all([
      apiFetch<Paginated<Order>>('/api/account/orders', { token })
        .then(setOrders)
        .catch(() => setOrders(null)),
      loadAddresses(),
    ]).finally(() => setLoading(false));
  }, [authLoading, token, loadAddresses]);

  async function makeDefault(address: Address) {
    setBusyAddressId(address.id);
    try {
      /* PUT expects the whole address, so the stored row is sent back with only
         the flag changed — a partial body would blank the rest of it. */
      await apiFetch(`/api/account/addresses/${address.id}`, {
        method: 'PUT', token,
        body: {
          fullName: address.fullName, phone: address.phone, line1: address.line1,
          line2: address.line2 ?? null, landmark: address.landmark ?? null,
          city: address.city, state: address.state, pincode: address.pincode,
          type: address.type, isDefault: true,
        },
      });
      await loadAddresses();
    } finally {
      setBusyAddressId(null);
    }
  }

  async function remove(address: Address) {
    setBusyAddressId(address.id);
    try {
      await apiFetch(`/api/account/addresses/${address.id}`, { method: 'DELETE', token });
      await loadAddresses();
    } finally {
      setBusyAddressId(null);
    }
  }

  if (authLoading || loading) {
    return <div className="shell grid min-h-[60vh] place-items-center pt-28"><Spinner className="text-muted" /></div>;
  }

  if (!user) {
    return (
      <>
        <ListingHero crumb="Account" title="Your account" />
        <div className="shell py-10 md:py-16">
          <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface px-6 py-10 text-center shadow-card md:px-10">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-ink text-amber">
              <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c.9-3.6 3.6-5.5 7-5.5s6.1 1.9 7 5.5" />
              </svg>
            </span>
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em] text-content">Sign in with your phone</h2>
            <p className="mt-2 text-sm text-muted">
              We text you a 6-digit code. No password to remember.
            </p>
            <Button size="lg" onClick={openSignIn} className="mt-6 w-full">Sign in</Button>

            <ul className="mt-6 space-y-2 border-t border-line pt-5 text-left text-sm text-muted">
              {['Track every order, step by step', 'Download your GST invoices', 'Reuse your saved delivery address'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <svg viewBox="0 0 16 16" className="mt-1 size-3.5 shrink-0 text-success" aria-hidden="true">
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </>
    );
  }

  const firstName = user.fullName?.trim().split(/\s+/)[0];
  const orderCount = orders?.items.length ?? 0;

  return (
    <>
      <ListingHero
        crumb="Account"
        title={firstName ? `Hello, ${firstName}` : 'Your account'}
        description={<span className="numeric">{user.phone}</span>}
        action={
          <Button variant="onink" size="sm" onClick={() => void logout()}>Sign out</Button>
        }
      />

      <div className="shell grid gap-8 pb-14 pt-6 md:pt-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-10">
        {/* ---- Orders ------------------------------------------------- */}
        <section aria-labelledby="orders-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="orders-heading" className="font-display text-xl font-semibold tracking-[-0.02em] text-content">Your orders</h2>
            {orderCount > 0 && <span className="numeric text-sm text-muted">{orderCount}</span>}
          </div>

          {!orders || orders.items.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
              <p className="font-display text-lg font-semibold text-content">No orders yet</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                When you buy a table it will appear here, with its tracking and invoice.
              </p>
              <ButtonLink href="/shop" className="mt-5">Shop all tables</ButtonLink>
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
              {orders.items.map((order) => {
                const invoiceAvailable = order.status !== 'pending_payment' && order.status !== 'cancelled';
                const extra = order.lines.length - 3;
                return (
                  <li key={order.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-lift sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/order/${order.orderNumber}`}
                          className="numeric font-semibold text-content transition-colors hover:text-crimson"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">Placed {formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="numeric font-semibold text-content">{formatINR(order.grandTotal)}</p>
                        <Badge
                          className="mt-1"
                          tone={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'warning' : 'neutral'}
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {order.lines.slice(0, 3).map((line) => (
                          <span key={line.id} className="relative size-12 overflow-hidden rounded-xl border-2 border-surface bg-sand">
                            {line.imageUrl && <Image src={line.imageUrl} alt="" fill sizes="48px" className="object-cover" />}
                          </span>
                        ))}
                        {extra > 0 && (
                          <span className="numeric grid size-12 place-items-center rounded-xl border-2 border-surface bg-sand text-xs font-medium text-muted">
                            +{extra}
                          </span>
                        )}
                      </div>
                      <p className="min-w-0 text-sm text-muted">
                        <span className="line-clamp-1 text-content">{order.lines[0]?.name}</span>
                        {order.lines.length > 1 ? `and ${order.lines.length - 1} more` : order.lines[0]?.variantLabel}
                      </p>
                    </div>

                    <OrderProgress status={order.status} className="mt-5" />

                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                      <ButtonLink href={`/order/${order.orderNumber}`} variant="secondary" size="sm">
                        Track order
                      </ButtonLink>
                      {invoiceAvailable && (
                        <a
                          href={`${API_URL}/api/account/orders/${order.orderNumber}/invoice`}
                          className="text-sm text-muted underline-offset-4 transition-colors hover:text-content hover:underline"
                        >
                          Download invoice
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---- Addresses ---------------------------------------------- */}
        <section aria-labelledby="addresses-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="addresses-heading" className="font-display text-xl font-semibold tracking-[-0.02em] text-content">Saved addresses</h2>
            {addresses.length > 0 && <span className="numeric text-sm text-muted">{addresses.length}</span>}
          </div>

          {addresses.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line-strong bg-surface px-5 py-10 text-center">
              <p className="text-sm font-medium text-content">Nothing saved yet</p>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
                The address you use at checkout is kept here, so the next table takes
                a few seconds instead of a full form.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {addresses.map((address) => (
                <li key={address.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-content">{address.fullName}</p>
                    {address.isDefault && <Badge tone="accent">Default</Badge>}
                  </div>

                  <address className="mt-2 text-sm not-italic leading-relaxed text-muted">
                    {address.line1}
                    {address.line2 ? <>, {address.line2}</> : null}
                    <br />
                    {address.landmark ? <>{address.landmark}<br /></> : null}
                    {address.city}, {address.state}{' '}
                    <span className="numeric">{address.pincode}</span>
                    <br />
                    <span className="numeric">{address.phone}</span>
                  </address>

                  <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-sm">
                    {!address.isDefault && (
                      <button
                        type="button"
                        disabled={busyAddressId === address.id}
                        onClick={() => void makeDefault(address)}
                        className="cursor-pointer text-muted underline-offset-4 transition-colors hover:text-content hover:underline disabled:opacity-50"
                      >
                        Use by default
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyAddressId === address.id}
                      onClick={() => void remove(address)}
                      className="cursor-pointer text-muted underline-offset-4 transition-colors hover:text-crimson hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-xs leading-relaxed text-faint">
            Removing an address here does not change any order already placed — each
            order keeps its own copy of where it was sent.
          </p>
        </section>
      </div>
    </>
  );
}
