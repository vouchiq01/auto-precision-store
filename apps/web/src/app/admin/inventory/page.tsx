'use client';

import { useState } from 'react';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { Badge, Spinner } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { PageHeading, StatCard, Table } from '@/components/admin/ui';

interface InventoryRow {
  variantId: string; sku: string; optionLabel: string;
  stockQty: number; lowStockThreshold: number;
  productName: string; productSlug: string; waitlist: number;
}

export default function AdminInventoryPage() {
  const { data, loading, error, busy, mutate } = useAdminResource<{
    items: InventoryRow[]; lowStock: number; outOfStock: number;
  }>('/api/admin/inventory');
  const [edits, setEdits] = useState<Record<string, string>>({});

  async function save(variantId: string) {
    const value = Number(edits[variantId]);
    if (!Number.isInteger(value) || value < 0) return;
    await mutate('PATCH', `/api/admin/products/variants/${variantId}/stock`, { stockQty: value });
    setEdits((prev) => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  }

  return (
    <>
      <PageHeading title="Inventory" description="Stock counts per variant" />

      {data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Variants tracked" value={String(data.items.length)} />
          <StatCard label="Low stock" value={String(data.lowStock)} hint="at or below threshold" />
          <StatCard label="Out of stock" value={String(data.outOfStock)} />
        </div>
      )}

      {error && <p role="alert" className="mb-4 text-sm text-crimson-bright">{error}</p>}
      {loading ? (
        <div className="grid h-48 place-items-center"><Spinner className="text-steel" /></div>
      ) : (
        <Table head={['Product', 'Variant', 'SKU', 'In stock', 'Waiting', 'Set to', '']}>
          {data?.items.map((row) => {
            const editing = edits[row.variantId] !== undefined;
            const out = row.stockQty === 0;
            const low = !out && row.stockQty <= row.lowStockThreshold;

            return (
              <tr key={row.variantId} className={out ? 'bg-crimson/5' : undefined}>
                <td className="px-4 py-3 text-bone">{row.productName}</td>
                <td className="px-4 py-3 text-steel">{row.optionLabel}</td>
                <td className="numeric px-4 py-3 text-xs text-steel-dim">{row.sku}</td>
                <td className="px-4 py-3">
                  <span className="numeric mr-2 text-bone">{row.stockQty}</span>
                  {out && <Badge tone="warning">Out</Badge>}
                  {low && <Badge tone="warning">Low</Badge>}
                </td>
                <td className="numeric px-4 py-3 text-steel">
                  {row.waitlist > 0 ? `${row.waitlist} waiting` : '—'}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    value={edits[row.variantId] ?? ''}
                    placeholder={String(row.stockQty)}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [row.variantId]: e.target.value }))}
                    className="numeric h-8 w-20 rounded-lg border border-ink-line bg-ink px-2 text-sm text-bone outline-none focus:border-bone"
                  />
                </td>
                <td className="px-4 py-3">
                  {editing && (
                    <Button size="sm" loading={busy} onClick={() => void save(row.variantId)}>Save</Button>
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
