'use client';

import { formatDateTime } from '@/lib/format';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { Badge, Spinner } from '@/components/ui/primitives';
import { PageHeading, Table, selectClass } from '@/components/admin/ui';

const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;

interface EnquiryRow {
  enquiry: {
    id: string; name: string; phone: string; email: string | null;
    businessName: string | null; city: string | null; quantity: number | null;
    message: string; status: typeof STATUSES[number]; createdAt: string;
  };
  productName: string | null;
}

export default function AdminEnquiriesPage() {
  const { data, loading, error, busy, mutate } = useAdminResource<{ items: EnquiryRow[] }>(
    '/api/admin/enquiries?perPage=50',
  );

  return (
    <>
      <PageHeading title="Enquiries" description="Bulk and dealer leads" />

      {error && <p role="alert" className="mb-4 text-sm text-crimson-bright">{error}</p>}
      {loading ? (
        <div className="grid h-48 place-items-center"><Spinner className="text-steel" /></div>
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-steel">No enquiries yet.</p>
      ) : (
        <Table head={['Contact', 'Business', 'Qty', 'Message', 'Status', 'Received']}>
          {data.items.map(({ enquiry }) => (
            <tr key={enquiry.id}>
              <td className="px-4 py-3">
                <span className="block text-bone">{enquiry.name}</span>
                <a href={`tel:${enquiry.phone}`} className="numeric text-xs text-steel hover:text-bone">{enquiry.phone}</a>
                {enquiry.email && <span className="block text-xs text-steel-dim">{enquiry.email}</span>}
              </td>
              <td className="px-4 py-3 text-steel">
                {enquiry.businessName ?? '—'}
                {enquiry.city && <span className="block text-xs text-steel-dim">{enquiry.city}</span>}
              </td>
              <td className="numeric px-4 py-3 text-steel">{enquiry.quantity ?? '—'}</td>
              <td className="max-w-md px-4 py-3 text-xs leading-relaxed text-steel">{enquiry.message}</td>
              <td className="px-4 py-3">
                <select
                  value={enquiry.status}
                  disabled={busy}
                  onChange={(e) => void mutate('PATCH', `/api/admin/enquiries/${enquiry.id}`, { status: e.target.value })}
                  className={`${selectClass} h-8 w-32 text-xs`}
                >
                  {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-steel-dim">{formatDateTime(enquiry.createdAt)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
