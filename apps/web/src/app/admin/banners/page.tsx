'use client';

import Image from 'next/image';
import { useState } from 'react';
import { formatDate } from '@/lib/format';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { Badge, Spinner } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Card, Field, PageHeading, Table, inputClass, selectClass } from '@/components/admin/ui';

interface Banner {
  id: string; title: string; subtitle: string | null; eyebrow: string | null;
  imageDesktop: string; imageMobile: string | null;
  ctaLabel: string | null; ctaUrl: string | null;
  placement: string; sortOrder: number;
  startsAt: string | null; endsAt: string | null; isActive: boolean;
}

const EMPTY = {
  eyebrow: '', title: '', subtitle: '',
  imageDesktop: '', imageMobile: '',
  ctaLabel: '', ctaUrl: '', placement: 'hero',
  startsAt: '', endsAt: '',
};

export default function AdminBannersPage() {
  const { data, loading, error, busy, mutate } = useAdminResource<{ items: Banner[] }>('/api/admin/banners');
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    await mutate('POST', '/api/admin/banners', {
      ...form,
      subtitle: form.subtitle || null,
      eyebrow: form.eyebrow || null,
      imageMobile: form.imageMobile || null,
      ctaLabel: form.ctaLabel || null,
      ctaUrl: form.ctaUrl || null,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      sortOrder: 0,
      isActive: true,
    });
    setForm(EMPTY);
    setOpen(false);
  }

  return (
    <>
      <PageHeading
        title="Banners"
        description="Hero and promotional artwork, with scheduling"
        action={<Button onClick={() => setOpen((v) => !v)}>{open ? 'Cancel' : 'New banner'}</Button>}
      />

      {open && (
        <Card className="mb-6">
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
            <Field label="Eyebrow" hint="Small label above the headline">
              <input value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} placeholder="The Apex line" className={inputClass} />
            </Field>
            <Field label="Headline">
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Subtitle">
              <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Placement">
              <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} className={selectClass}>
                <option value="hero">Hero (homepage)</option>
                <option value="strip">Strip</option>
                <option value="category">Category</option>
                <option value="product">Product</option>
              </select>
            </Field>
            <Field label="Desktop image URL" hint="Upload to Supabase Storage, or use a path under /public">
              <input required value={form.imageDesktop} onChange={(e) => setForm({ ...form, imageDesktop: e.target.value })}
                placeholder="/banners/hero-apex.jpg" className={inputClass} />
            </Field>
            <Field label="Mobile image URL" hint="Optional — falls back to the desktop image">
              <input value={form.imageMobile} onChange={(e) => setForm({ ...form, imageMobile: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Button label">
              <input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="See the Apex E9" className={inputClass} />
            </Field>
            <Field label="Button link">
              <input value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="/products/…" className={inputClass} />
            </Field>
            <Field label="Starts" hint="Leave blank to go live immediately">
              <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Ends" hint="Leave blank to run indefinitely">
              <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputClass} />
            </Field>

            <div className="sm:col-span-2">
              <Button type="submit" loading={busy}>Create banner</Button>
            </div>
          </form>
        </Card>
      )}

      {error && <p role="alert" className="mb-4 text-sm text-crimson">{error}</p>}
      {loading ? (
        <div className="grid h-48 place-items-center"><Spinner className="text-muted" /></div>
      ) : (
        <Table head={['Preview', 'Headline', 'Placement', 'Schedule', 'Status', '']}>
          {data?.items.map((banner) => (
            <tr key={banner.id}>
              <td className="px-4 py-3">
                <div className="relative h-12 w-24 overflow-hidden rounded-lg border border-line bg-canvas">
                  <Image src={banner.imageDesktop} alt="" fill sizes="96px" className="object-cover" />
                </div>
              </td>
              <td className="px-4 py-3">
                {banner.eyebrow && <span className="block text-xs text-faint">{banner.eyebrow}</span>}
                <span className="text-content">{banner.title}</span>
              </td>
              <td className="px-4 py-3 text-muted">{banner.placement}</td>
              <td className="px-4 py-3 text-xs text-faint">
                {banner.startsAt || banner.endsAt
                  ? `${banner.startsAt ? formatDate(banner.startsAt) : 'now'} → ${banner.endsAt ? formatDate(banner.endsAt) : 'no end'}`
                  : 'Always on'}
              </td>
              <td className="px-4 py-3">
                <Badge tone={banner.isActive ? 'success' : 'neutral'}>{banner.isActive ? 'Active' : 'Off'}</Badge>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void mutate('DELETE', `/api/admin/banners/${banner.id}`)}
                  className="text-xs text-muted transition-colors hover:text-crimson"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
