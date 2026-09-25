'use client';

import { formatDate } from '@/lib/format';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { Badge, Spinner } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/admin/ui';

interface ReviewRow {
  review: {
    id: string; rating: number; title: string; body: string;
    status: 'pending' | 'approved' | 'rejected';
    authorName: string; isVerifiedPurchase: boolean; createdAt: string;
  };
  productName: string;
}

export default function AdminReviewsPage() {
  const { data, loading, error, busy, mutate } = useAdminResource<{ items: ReviewRow[] }>(
    '/api/admin/reviews?status=pending&perPage=50',
  );

  return (
    <>
      <PageHeading title="Reviews" description="Pending moderation" />

      {error && <p role="alert" className="mb-4 text-sm text-crimson-bright">{error}</p>}
      {loading ? (
        <div className="grid h-48 place-items-center"><Spinner className="text-steel" /></div>
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-steel">Nothing waiting for moderation.</p>
      ) : (
        <ul className="space-y-4">
          {data.items.map(({ review, productName }) => (
            <li key={review.id} className="rounded-2xl border border-ink-line bg-ink-raised p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-crimson">{'★'.repeat(review.rating)}<span className="text-ink-line">{'★'.repeat(5 - review.rating)}</span></span>
                {review.isVerifiedPurchase && <Badge tone="success">Verified purchase</Badge>}
                <span className="text-xs text-steel-dim">{productName}</span>
              </div>

              <h3 className="mt-3 font-medium text-bone">{review.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-steel">{review.body}</p>
              <p className="mt-3 text-xs text-steel-dim">{review.authorName} · {formatDate(review.createdAt)}</p>

              <div className="mt-4 flex gap-2">
                <Button size="sm" loading={busy} onClick={() => void mutate('PATCH', `/api/admin/reviews/${review.id}`, { status: 'approved' })}>
                  Publish
                </Button>
                <Button size="sm" variant="danger" loading={busy} onClick={() => void mutate('PATCH', `/api/admin/reviews/${review.id}`, { status: 'rejected' })}>
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
