'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatINR, type DashboardStats } from '@aps/shared';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, PageHeading, StatCard } from '@/components/admin/ui';
import { Spinner } from '@/components/ui/primitives';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    void apiFetch<DashboardStats>('/api/admin/dashboard?days=30', { token })
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="grid h-64 place-items-center"><Spinner className="text-muted" /></div>;
  if (!stats) return <p className="text-sm text-muted">Could not load the dashboard.</p>;

  const peak = Math.max(...stats.revenueSeries.map((point) => point.revenue), 1);

  return (
    <>
      <PageHeading title="Dashboard" description="Last 30 days" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={formatINR(stats.revenue.total)} delta={stats.revenue.delta} hint="vs previous 30 days" />
        <StatCard label="Orders" value={String(stats.orders.total)} delta={stats.orders.delta} hint="vs previous 30 days" />
        <StatCard label="Average order" value={formatINR(stats.averageOrderValue)} />
        <StatCard label="Awaiting fulfilment" value={String(stats.pendingOrders)} hint="paid, not yet shipped" />
      </div>

      {/* Anything here that is non-zero needs a human. Each links to its queue. */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/inventory" className="block">
          <StatCard label="Low stock" value={String(stats.lowStockCount)} hint="variants at or below threshold" />
        </Link>
        <Link href="/admin/reviews" className="block">
          <StatCard label="Reviews to moderate" value={String(stats.pendingReviews)} />
        </Link>
        <Link href="/admin/enquiries" className="block">
          <StatCard label="New enquiries" value={String(stats.newEnquiries)} />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <h2 className="eyebrow mb-6">Revenue</h2>
          {stats.revenueSeries.every((p) => p.revenue === 0) ? (
            <p className="py-12 text-center text-sm text-faint">No revenue in this period yet.</p>
          ) : (
            <div className="flex h-48 items-end gap-[3px]" role="img" aria-label="Daily revenue over the last 30 days">
              {stats.revenueSeries.map((point) => (
                <div key={point.date} className="group relative flex-1">
                  <div
                    className="w-full rounded-t bg-crimson/70 transition-colors group-hover:bg-crimson"
                    style={{ height: `${Math.max((point.revenue / peak) * 176, point.revenue > 0 ? 3 : 1)}px` }}
                  />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-sand px-2 py-1 text-[0.6875rem] text-content group-hover:block">
                    {point.date}: {formatINR(point.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="eyebrow mb-5">Top products</h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-faint">Nothing sold in this period yet.</p>
          ) : (
            <ol className="space-y-3.5">
              {stats.topProducts.map((product, i) => (
                <li key={product.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span className="numeric mr-2 text-xs text-faint">{String(i + 1).padStart(2, '0')}</span>
                    <Link href={`/products/${product.slug}`} className="text-sm text-content hover:underline">
                      {product.name}
                    </Link>
                    <span className="numeric block pl-6 text-xs text-faint">{product.unitsSold} sold</span>
                  </span>
                  <span className="numeric shrink-0 text-sm text-content">{formatINR(product.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
