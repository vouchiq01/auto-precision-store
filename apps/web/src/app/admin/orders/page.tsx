'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import {
  canTransition, CARRIERS, carrierTrackingUrl, formatINR, ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus,
} from '@aps/shared';
import { API_URL } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { Badge, Spinner } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { PageHeading, Table, selectClass, inputClass } from '@/components/admin/ui';

interface AdminOrderRow {
  order: {
    id: string; orderNumber: string; status: OrderStatus; grandTotal: number;
    createdAt: string; shippingAddress: Record<string, string>;
    carrier: string | null; trackingNumber: string | null; trackingUrl: string | null;
  };
  itemCount: number;
}

/** Draft state for the inline carrier/tracking form, open on at most one row at a time. */
interface TrackingDraft {
  orderId: string;
  /** Set only when this edit is also carrying out a status change — the
      confirm button both saves tracking and moves the order on. */
  pendingStatus: OrderStatus | null;
  carrier: string;
  trackingNumber: string;
  trackingUrlOverride: string;
}

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [draft, setDraft] = useState<TrackingDraft | null>(null);
  const query = statusFilter ? `?status=${statusFilter}&perPage=50` : '?perPage=50';
  const { data, loading, error, busy, mutate, setError } = useAdminResource<{ items: AdminOrderRow[]; total: number }>(
    `/api/admin/orders${query}`,
  );

  async function changeStatus(orderId: string, status: OrderStatus) {
    await mutate('PATCH', `/api/admin/orders/${orderId}/status`, { status });
  }

  function openTrackingForm(row: AdminOrderRow, pendingStatus: OrderStatus | null) {
    setError(null);
    setDraft({
      orderId: row.order.id,
      pendingStatus,
      carrier: row.order.carrier ?? CARRIERS[0].id,
      trackingNumber: row.order.trackingNumber ?? '',
      trackingUrlOverride: '',
    });
  }

  async function saveTracking() {
    if (!draft) return;
    const carrierMeta = CARRIERS.find((c) => c.id === draft.carrier);
    const trackingUrl = draft.trackingUrlOverride.trim()
      || carrierTrackingUrl(draft.carrier, draft.trackingNumber)
      || null;

    const body: Record<string, unknown> = {
      carrier: carrierMeta?.name ?? draft.carrier,
      trackingNumber: draft.trackingNumber.trim(),
      trackingUrl,
    };
    // A plain tracking edit has no status change; a shipped transition does.
    if (draft.pendingStatus) body.status = draft.pendingStatus;
    else {
      const current = data?.items.find((r) => r.order.id === draft.orderId)?.order.status;
      if (current) body.status = current;
    }

    await mutate('PATCH', `/api/admin/orders/${draft.orderId}/status`, body);
    setDraft(null);
  }

  return (
    <>
      <PageHeading
        title="Orders"
        description={data ? `${data.total} orders` : undefined}
        action={
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${selectClass} w-48`}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>{ORDER_STATUS_LABELS[status]}</option>
            ))}
          </select>
        }
      />

      {error && <p role="alert" className="mb-4 text-sm text-crimson">{error}</p>}
      {loading ? (
        <div className="grid h-48 place-items-center"><Spinner className="text-muted" /></div>
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-muted">No orders yet.</p>
      ) : (
        <Table head={['Order', 'Customer', 'Items', 'Total', 'Status', 'Tracking', 'Change to', 'Date', '']}>
          {data.items.map(({ order, itemCount }) => {
            // Only legal next states are offered, so the UI cannot propose a
            // transition the API will reject.
            const nextStates = ORDER_STATUSES.filter((s) => canTransition(order.status, s));
            const invoiceable = order.status !== 'pending_payment' && order.status !== 'cancelled';
            const canHaveTracking = order.status !== 'pending_payment' && order.status !== 'cancelled';
            const row = { order, itemCount };
            const draftOpenHere = draft?.orderId === order.id;

            return (
              <Fragment key={order.id}>
                <tr>
                  <td className="numeric whitespace-nowrap px-4 py-3 text-content">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-muted">
                    <span className="block text-content">{order.shippingAddress.fullName}</span>
                    <span className="numeric text-xs text-faint">{order.shippingAddress.phone}</span>
                  </td>
                  <td className="numeric px-4 py-3 text-muted">{itemCount}</td>
                  <td className="numeric whitespace-nowrap px-4 py-3 text-content">{formatINR(order.grandTotal)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'warning' : 'neutral'}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {order.trackingNumber ? (
                      <button
                        type="button"
                        onClick={() => openTrackingForm(row, null)}
                        className="cursor-pointer text-left text-xs text-muted underline-offset-4 hover:text-content hover:underline"
                      >
                        <span className="block text-content">{order.carrier}</span>
                        <span className="numeric">{order.trackingNumber}</span>
                      </button>
                    ) : canHaveTracking ? (
                      <button
                        type="button"
                        onClick={() => openTrackingForm(row, null)}
                        className="cursor-pointer text-xs text-muted underline-offset-4 hover:text-content hover:underline"
                      >
                        + Add tracking
                      </button>
                    ) : (
                      <span className="text-xs text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {nextStates.length === 0 ? (
                      <span className="text-xs text-faint">Final</span>
                    ) : (
                      <select
                        value=""
                        disabled={busy}
                        onChange={(e) => {
                          const next = e.target.value as OrderStatus | '';
                          if (!next) return;
                          // Shipping without a carrier and AWB leaves the
                          // customer with no way to track the order, so that
                          // one transition always stops for the form first.
                          if (next === 'shipped') openTrackingForm(row, next);
                          else void changeStatus(order.id, next);
                        }}
                        className="h-8 rounded-lg border border-line bg-canvas px-2 text-xs text-content outline-none"
                      >
                        <option value="">—</option>
                        {nextStates.map((status) => (
                          <option key={status} value={status}>{ORDER_STATUS_LABELS[status]}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-faint">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    {invoiceable && (
                      <a
                        href={`${API_URL}/api/admin/orders/${order.id}/invoice`}
                        className="text-xs text-muted underline-offset-4 hover:text-content hover:underline"
                      >
                        Invoice
                      </a>
                    )}
                  </td>
                </tr>

                {draftOpenHere && draft && (
                  <tr key={`${order.id}-tracking`}>
                    <td colSpan={9} className="bg-sand/50 px-4 py-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="block">
                          <span className="mb-1.5 block text-xs text-faint">Carrier</span>
                          <select
                            value={draft.carrier}
                            onChange={(e) => setDraft({ ...draft, carrier: e.target.value })}
                            className={`${selectClass} h-9 w-44 text-xs`}
                          >
                            {CARRIERS.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs text-faint">Tracking / AWB number</span>
                          <input
                            value={draft.trackingNumber}
                            onChange={(e) => setDraft({ ...draft, trackingNumber: e.target.value })}
                            placeholder="e.g. 1234567890"
                            className={`${inputClass} h-9 w-48 text-xs`}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs text-faint">
                            Tracking link
                            {carrierTrackingUrl(draft.carrier, draft.trackingNumber) && !draft.trackingUrlOverride && (
                              <span className="ml-1 text-faint">(auto-filled — override if needed)</span>
                            )}
                          </span>
                          <input
                            value={draft.trackingUrlOverride}
                            onChange={(e) => setDraft({ ...draft, trackingUrlOverride: e.target.value })}
                            placeholder={carrierTrackingUrl(draft.carrier, draft.trackingNumber) ?? 'https://…'}
                            className={`${inputClass} h-9 w-64 text-xs`}
                          />
                        </label>
                        <Button
                          size="sm"
                          loading={busy}
                          disabled={!draft.carrier || !draft.trackingNumber.trim()}
                          onClick={() => void saveTracking()}
                        >
                          {draft.pendingStatus ? `Save and mark ${ORDER_STATUS_LABELS[draft.pendingStatus]}` : 'Save tracking'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </Table>
      )}
    </>
  );
}
