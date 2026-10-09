'use client';

import { useEffect, useState } from 'react';
import type { Paginated, ProductSummary } from '@aps/shared';
import { formatDate } from '@/lib/format';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { Badge, Spinner } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Card, Field, PageHeading, inputClass, selectClass } from '@/components/admin/ui';

type Status = 'pending' | 'approved' | 'rejected';

interface ReviewRow {
  review: {
    id: string; rating: number; title: string; body: string; status: Status;
    authorName: string; isVerifiedPurchase: boolean; createdAt: string;
  };
  productName: string;
}

const TABS: { value: Status | 'all'; label: string }[] = [
  { value: 'pending', label: 'Waiting' },
  { value: 'approved', label: 'Published' },
  { value: 'rejected', label: 'Hidden' },
  { value: 'all', label: 'All' },
];

const EMPTY = { productId: '', authorName: '', rating: '5', title: '', body: '' };

export default function AdminReviewsPage() {
  const [tab, setTab] = useState<Status | 'all'>('pending');
  const path = `/api/admin/reviews?perPage=50${tab === 'all' ? '' : `&status=${tab}`}`;
  const { data, loading, error, busy, mutate } = useAdminResource<{ items: ReviewRow[] }>(path);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    apiFetch<Paginated<ProductSummary>>('/api/catalog/products?perPage=48&sort=name')
      .then((page) => setProducts(page.items.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => { /* the form just has no products to pick from */ });
  }, []);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    try {
      await mutate('POST', '/api/admin/reviews', { ...form, rating: Number(form.rating) });
      setForm(EMPTY); setOpen(false); setTab('approved');
    } catch { /* shown above the list */ }
  }

  const set = (id: string, status: Status) => void mutate('PATCH', `/api/admin/reviews/${id}`, { status }).catch(() => undefined);
  const remove = (id: string) => {
    if (window.confirm('Delete this review for good? Use Hide to keep it out of sight without deleting.')) {
      void mutate('DELETE', `/api/admin/reviews/${id}`).catch(() => undefined);
    }
  };

  return (
    <>
      <PageHeading
        title="Reviews & ratings"
        description="What shows as stars on the product cards and pages. Only published reviews count."
        action={<Button onClick={() => setOpen((v) => !v)}>{open ? 'Cancel' : 'Add a review'}</Button>}
      />

      <Card className="mb-6 text-sm leading-relaxed text-muted">
        Customers can write a review on a product page; it waits here until you publish it. You can also add feedback
        you have received yourself (WhatsApp, a call, a marketplace). <span className="text-content">Add only what a real
        customer actually said</span> — writing reviews that are not real is against India’s consumer-protection rules for
        online sellers, and the average on each card is worked out from exactly what is published here.
      </Card>

      {open && (
        <Card className="mb-6">
          <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
            <Field label="Product">
              <select required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className={selectClass}>
                <option value="">Choose a product…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Customer’s name" hint="As you want it shown, e.g. Priya S., Mysuru">
              <input required minLength={2} maxLength={60} value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Stars">
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className={selectClass}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'star' : 'stars'}</option>)}
              </select>
            </Field>
            <Field label="Headline">
              <input required minLength={3} maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Their words">
                <textarea required minLength={10} maxLength={2000} rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="w-full rounded-xl border border-line bg-canvas px-3.5 py-3 text-sm text-content outline-none focus:border-line-strong" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={busy}>Publish review</Button>
            </div>
          </form>
        </Card>
      )}

      <div role="tablist" aria-label="Review status" className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value} type="button" role="tab" aria-selected={tab === t.value} onClick={() => setTab(t.value)}
            className={cn('h-10 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors',
              tab === t.value ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-content hover:border-line-strong')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-crimson">{error}</p>}
      {loading ? (
        <div className="grid h-48 place-items-center"><Spinner className="text-muted" /></div>
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-muted">Nothing here.</p>
      ) : (
        <ul className="space-y-4">
          {data.items.map(({ review, productName }) => (
            <li key={review.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-amber-deep" aria-label={`${review.rating} out of 5`}>{'★'.repeat(review.rating)}<span className="text-line-strong">{'★'.repeat(5 - review.rating)}</span></span>
                <Badge tone={review.status === 'approved' ? 'success' : 'neutral'}>{review.status === 'approved' ? 'Published' : review.status === 'pending' ? 'Waiting' : 'Hidden'}</Badge>
                {review.isVerifiedPurchase && <Badge tone="success">Verified purchase</Badge>}
                <span className="text-xs text-faint">{productName}</span>
              </div>

              <h3 className="mt-3 font-medium text-content">{review.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{review.body}</p>
              <p className="mt-3 text-xs text-faint">{review.authorName} · {formatDate(review.createdAt)}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {review.status !== 'approved' && <Button size="sm" loading={busy} onClick={() => set(review.id, 'approved')}>Publish</Button>}
                {review.status === 'approved' && <Button size="sm" variant="secondary" loading={busy} onClick={() => set(review.id, 'rejected')}>Hide</Button>}
                {review.status === 'pending' && <Button size="sm" variant="danger" loading={busy} onClick={() => set(review.id, 'rejected')}>Reject</Button>}
                <button type="button" onClick={() => remove(review.id)} className="cursor-pointer px-2 text-xs text-muted hover:text-crimson">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
