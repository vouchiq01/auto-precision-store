import type { ReviewPage } from '@/lib/queries';
import { formatDate } from '@/lib/format';
import { Badge, Eyebrow } from '@/components/ui/primitives';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm text-crimson" aria-label={`${rating} out of 5`}>
      {'★'.repeat(rating)}<span className="text-line">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export function Reviews({ reviews }: { reviews: ReviewPage | null }) {
  if (!reviews || reviews.total === 0) {
    return (
      <section id="reviews" className="shell scroll-mt-32 py-10 md:py-14">
        <Eyebrow>Reviews</Eyebrow>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-surface px-5 py-4 ring-1 ring-line">
          <span className="text-lg tracking-widest text-line-strong" aria-hidden="true">★★★★★</span>
          <p className="text-sm text-muted">No reviews yet — owners’ reviews appear here once they are published.</p>
        </div>
      </section>
    );
  }

  const { distribution, total, items } = reviews;
  const counts = [
    ['5', distribution.five], ['4', distribution.four], ['3', distribution.three],
    ['2', distribution.two], ['1', distribution.one],
  ] as const;

  return (
    <section id="reviews" className="shell scroll-mt-32 py-10 md:py-14">
      <div>
        <Eyebrow>Reviews</Eyebrow>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-content md:text-[1.875rem]">From people who own one.</h2>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <div>
          <p className="numeric font-display text-5xl font-semibold text-content">
            {distribution.average.toFixed(1)}
          </p>
          <p className="numeric mt-1 text-sm text-muted">{total} reviews</p>

          <dl className="mt-6 space-y-2">
            {counts.map(([star, count]) => (
              <div key={star} className="flex items-center gap-3">
                <dt className="numeric w-3 text-xs text-muted">{star}</dt>
                <dd className="flex-1">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-line">
                    <span
                      className="block h-full rounded-full bg-crimson"
                      style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                    />
                  </span>
                </dd>
                <span className="numeric w-6 text-right text-xs text-faint">{count}</span>
              </div>
            ))}
          </dl>
        </div>

        <ul className="divide-y divide-line border-t border-line">
          {items.map((review) => (
            <li key={review.id} className="py-5">
              <div className="flex flex-wrap items-center gap-3">
                <Stars rating={review.rating} />
                {review.isVerifiedPurchase && <Badge tone="success">Verified purchase</Badge>}
              </div>
              <h3 className="mt-2.5 font-medium text-content">{review.title}</h3>
              <p className="mt-2 max-w-2xl leading-relaxed text-muted">{review.body}</p>
              <p className="mt-3 text-xs text-faint">
                {review.authorName} · {formatDate(review.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
