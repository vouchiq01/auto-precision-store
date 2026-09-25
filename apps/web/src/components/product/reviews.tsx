import type { ReviewPage } from '@/lib/queries';
import { formatDate } from '@/lib/format';
import { Badge, Eyebrow, SectionNumber } from '@/components/ui/primitives';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm text-crimson" aria-label={`${rating} out of 5`}>
      {'★'.repeat(rating)}<span className="text-ink-line">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export function Reviews({ reviews }: { reviews: ReviewPage | null }) {
  if (!reviews || reviews.total === 0) {
    return (
      <section className="shell py-20 md:py-28">
        <Eyebrow>Reviews</Eyebrow>
        <h2 className="display-md mt-4 text-bone">No reviews yet.</h2>
        <p className="lede mt-5">
          This table has not been reviewed on the site yet. If you own one, we would genuinely
          like to hear what it is like after six months of real use.
        </p>
      </section>
    );
  }

  const { distribution, total, items } = reviews;
  const counts = [
    ['5', distribution.five], ['4', distribution.four], ['3', distribution.three],
    ['2', distribution.two], ['1', distribution.one],
  ] as const;

  return (
    <section className="shell py-20 md:py-28">
      <div className="flex items-end justify-between gap-8">
        <div>
          <Eyebrow>Reviews</Eyebrow>
          <h2 className="display-md mt-4 text-bone">From people who own one.</h2>
        </div>
        <SectionNumber value="05" className="hidden md:block" />
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[18rem_1fr]">
        <div>
          <p className="numeric font-display text-6xl font-semibold text-bone">
            {distribution.average.toFixed(1)}
          </p>
          <p className="numeric mt-1 text-sm text-steel">{total} reviews</p>

          <dl className="mt-6 space-y-2">
            {counts.map(([star, count]) => (
              <div key={star} className="flex items-center gap-3">
                <dt className="numeric w-3 text-xs text-steel">{star}</dt>
                <dd className="flex-1">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-ink-line">
                    <span
                      className="block h-full rounded-full bg-crimson"
                      style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                    />
                  </span>
                </dd>
                <span className="numeric w-6 text-right text-xs text-steel-dim">{count}</span>
              </div>
            ))}
          </dl>
        </div>

        <ul className="divide-y divide-ink-line border-t border-ink-line">
          {items.map((review) => (
            <li key={review.id} className="py-6">
              <div className="flex flex-wrap items-center gap-3">
                <Stars rating={review.rating} />
                {review.isVerifiedPurchase && <Badge tone="success">Verified purchase</Badge>}
              </div>
              <h3 className="mt-2.5 font-medium text-bone">{review.title}</h3>
              <p className="mt-2 max-w-2xl leading-relaxed text-steel">{review.body}</p>
              <p className="mt-3 text-xs text-steel-dim">
                {review.authorName} · {formatDate(review.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
