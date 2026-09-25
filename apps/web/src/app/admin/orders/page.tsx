'use client';

import Link from 'next/link';
import { useState } from 'react';
import { canTransition, formatINR, ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from '@aps/shared';
import { API_URL } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { Badge, Spinner } from '@/components/ui/primitives';
import { PageHeading, Table, selectClass } from '@/components/admin/ui';

interface AdminOrderRow {
  order: {
    id: string; orderNumber: string; status: OrderStatus; grandTotal: number;
    createdAt: string; shippingAddress: Record<string, string>;
  };
  itemCount: number;
}

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const query = statusFilter ? `?status=${statusFilter}&perPage=50` : '?perPage=50';
  const { data, loading, error, busy, mutate } = useAdminResource<{ items: AdminOrderRow[]; total: number }>(
    `/api/admin/orders${query}`,
  );

  async function changeStatus(orderId: string, status: OrderStatus) {
    await mutate('PATCH', `/api/admin/orders/${orderId}/status`, { status });
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
        <Table head={['Order', 'Customer', 'Items', 'Total', 'Status', 'Change to', 'Date', '']}>
          {data.items.map(({ order, itemCount }) => {
            // Only legal next states are offered, so the UI cannot propose a
            // transition the API will reject.
            const nextStates = ORDER_STATUSES.filter((s) => canTransition(order.status, s));
            const invoiceable = order.status !== 'pending_payment' && order.status !== 'cancelled';

            return (
              <tr key={order.id}>
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
                  {nextStates.length === 0 ? (
                    <span className="text-xs text-faint">Final</span>
                  ) : (
                    <select
                      value=""
                      disabled={busy}
                      onChange={(e) => { if (e.target.value) void changeStatus(order.id, e.target.value as OrderStatus); }}
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
            );
          })}
        </Table>
      )}
    </>
  );
}
