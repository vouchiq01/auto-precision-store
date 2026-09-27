'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  formatINR, ORDER_STATUS_LABELS, type Address, type Order, type Paginated,
} from '@aps/shared';
import { apiFetch, API_URL } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { Badge, EmptyState, Eyebrow, Spinner } from '@/components/ui/primitives';
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

  const firstName = user.fullName?.trim().split(/\s+/)[0];

  return (
    <div className="shell pt-28 pb-24 md:pt-36">
      {/* A header, not a headline. The page's job is the lists below it. */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
        <div className="min-w-0">
          <Eyebrow>Account</Eyebrow>
          <h1 className="mt-3 truncate font-display text-[clamp(1.75rem,3.4vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-content">
            {firstName || 'Your account'}<span className="text-crimson">.</span>
          </h1>
          <p className="numeric mt-2 text-sm text-muted">{user.phone}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void logout()}>Sign out</Button>
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
        {/* ---- Orders ------------------------------------------------- */}
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Your orders</h2>
            {orders && orders.items.length > 0 && (
              <span className="numeric text-xs text-faint">{orders.items.length}</span>
            )}
          </div>

          {!orders || orders.items.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No orders yet"
                description="When you buy a table it will appear here, with its invoice and tracking."
                action={<ButtonLink href="/collections/electric-lifting" variant="secondary">Browse tables</ButtonLink>}
              />
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {orders.items.map((order) => {
                const invoiceAvailable = order.status !== 'pending_payment' && order.status !== 'cancelled';
                return (
                  <li
                    key={order.id}
                    className="rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-lift"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/order/${order.orderNumber}`}
                          className="numeric font-medium text-content transition-colors hover:text-crimson"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="mt-1 text-sm text-muted">
                          {order.lines.length} {order.lines.length === 1 ? 'item' : 'items'} · {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="numeric font-medium text-content">{formatINR(order.grandTotal)}</p>
                        <Badge
                          className="mt-1.5"
                          tone={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'warning' : 'neutral'}
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-sm">
                      <Link
                        href={`/order/${order.orderNumber}`}
                        className="text-muted underline-offset-4 transition-colors hover:text-content hover:underline"
                      >
                        Track this order
                      </Link>
                      {invoiceAvailable && (
                        <a
                          href={`${API_URL}/api/account/orders/${order.orderNumber}/invoice`}
                          className="text-muted underline-offset-4 transition-colors hover:text-content hover:underline"
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
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Saved addresses</h2>
            {addresses.length > 0 && (
              <span className="numeric text-xs text-faint">{addresses.length}</span>
            )}
          </div>

          {addresses.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line px-5 py-10 text-center">
              <p className="text-sm font-medium text-content">Nothing saved yet</p>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
                The address you use at checkout is kept here, so the next table takes
                a few seconds instead of a full form.
              </p>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {addresses.map((address) => (
                <li key={address.id} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
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
    </div>
  );
}
