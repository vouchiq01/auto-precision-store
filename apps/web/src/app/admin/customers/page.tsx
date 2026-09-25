'use client';

import { useState } from 'react';
import { formatINR } from '@aps/shared';
import { formatDate } from '@/lib/format';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { Badge, Spinner } from '@/components/ui/primitives';
import { PageHeading, Table, inputClass } from '@/components/admin/ui';

interface CustomerRow {
  id: string; phone: string | null; email: string | null; fullName: string | null;
  isBlocked: boolean; createdAt: string; lastLoginAt: string | null;
  orderCount: number; lifetimeValue: number;
}

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('');
  const query = search ? `?search=${encodeURIComponent(search)}&perPage=50` : '?perPage=50';
  const { data, loading, error, busy, mutate } = useAdminResource<{ items: CustomerRow[]; total: number }>(
    `/api/admin/customers${query}`,
  );

  return (
    <>
      <PageHeading
        title="Customers"
        description={data ? `${data.total} customers` : undefined}
        action={
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone"
            aria-label="Search customers"
            className={`${inputClass} w-56`}
          />
        }
      />

      {error && <p role="alert" className="mb-4 text-sm text-crimson-bright">{error}</p>}
      {loading ? (
        <div className="grid h-48 place-items-center"><Spinner className="text-steel" /></div>
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-steel">No customers match that.</p>
      ) : (
        <Table head={['Customer', 'Orders', 'Lifetime value', 'Joined', 'Last seen', '']}>
          {data.items.map((customer) => (
            <tr key={customer.id}>
              <td className="px-4 py-3">
                <span className="block text-bone">{customer.fullName ?? 'Unnamed'}</span>
                <span className="numeric text-xs text-steel-dim">{customer.phone ?? customer.email}</span>
                {customer.isBlocked && <Badge tone="warning" className="ml-2">Blocked</Badge>}
              </td>
              <td className="numeric px-4 py-3 text-steel">{customer.orderCount}</td>
              <td className="numeric px-4 py-3 text-bone">{formatINR(customer.lifetimeValue)}</td>
              <td className="px-4 py-3 text-xs text-steel-dim">{formatDate(customer.createdAt)}</td>
              <td className="px-4 py-3 text-xs text-steel-dim">
                {customer.lastLoginAt ? formatDate(customer.lastLoginAt) : '—'}
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void mutate('PATCH', `/api/admin/customers/${customer.id}/block`, { isBlocked: !customer.isBlocked })}
                  className="text-xs text-steel transition-colors hover:text-crimson-bright"
                >
                  {customer.isBlocked ? 'Unblock' : 'Block'}
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
