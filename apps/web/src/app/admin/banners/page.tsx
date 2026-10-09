'use client';

import Image from 'next/image';
import { useState } from 'react';
import { formatDate } from '@/lib/format';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { useAuth } from '@/providers/auth-provider';
import { Badge, Spinner } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { UploadButton } from '@/components/admin/photo-uploader';
import { Card, Field, PageHeading, inputClass, selectClass } from '@/components/admin/ui';

interface Banner {
  id: string; title: string; subtitle: string | null; eyebrow: string | null;
  imageDesktop: string; imageMobile: string | null; videoUrl: string | null;
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
type Form = typeof EMPTY;

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

/** The full body the API wants, from a stored banner with some fields changed. */
function body(banner: Banner, changes: Partial<Banner> = {}) {
  const b = { ...banner, ...changes };
  return {
    title: b.title, subtitle: b.subtitle, eyebrow: b.eyebrow,
    imageDesktop: b.imageDesktop, imageMobile: b.imageMobile, videoUrl: b.videoUrl,
    ctaLabel: b.ctaLabel, ctaUrl: b.ctaUrl, placement: b.placement,
    sortOrder: b.sortOrder, startsAt: b.startsAt, endsAt: b.endsAt, isActive: b.isActive,
  };
}

export default function AdminBannersPage() {
  const { token } = useAuth();
  const { data, loading, error, busy, mutate } = useAdminResource<{ items: Banner[] }>('/api/admin/banners');
  const [form, setForm] = useState<Form>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const isCarousel = form.placement === 'hero';
  const items = data?.items ?? [];
  const slides = items.filter((b) => b.placement === 'hero');
  const others = items.filter((b) => b.placement !== 'hero');

  function startNew() { setForm(EMPTY); setEditing(null); setOpen(true); }
  function startEdit(b: Banner) {
    setForm({
      eyebrow: b.eyebrow ?? '', title: b.title, subtitle: b.subtitle ?? '',
      imageDesktop: b.imageDesktop, imageMobile: b.imageMobile ?? '',
      ctaLabel: b.ctaLabel ?? '', ctaUrl: b.ctaUrl ?? '', placement: b.placement,
      startsAt: day(b.startsAt), endsAt: day(b.endsAt),
    });
    setEditing(b.id); setOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function close() { setOpen(false); setEditing(null); setForm(EMPTY); }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      ...form,
      subtitle: form.subtitle || null, eyebrow: form.eyebrow || null,
      imageMobile: form.imageMobile || null, ctaLabel: form.ctaLabel || null, ctaUrl: form.ctaUrl || null,
      startsAt: form.startsAt || null, endsAt: form.endsAt || null,
    };
    try {
      if (editing) {
        const current = items.find((b) => b.id === editing);
        await mutate('PUT', `/api/admin/banners/${editing}`, { ...payload, videoUrl: current?.videoUrl ?? null, sortOrder: current?.sortOrder ?? 0, isActive: current?.isActive ?? true });
      } else {
        /* New slides go to the end of their group. */
        const last = items.filter((b) => b.placement === form.placement).length;
        await mutate('POST', '/api/admin/banners', { ...payload, sortOrder: last, isActive: true });
      }
      close();
    } catch { /* the error is shown above the list */ }
  }

  /* Reordering rewrites the whole group's sortOrder to 0..n-1, which also tidies
     the ties a hand-made banner can leave. */
  async function move(group: Banner[], from: number, to: number) {
    if (to < 0 || to >= group.length) return;
    const next = [...group];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    for (const [i, b] of next.entries()) {
      if (b.sortOrder !== i) await mutate('PUT', `/api/admin/banners/${b.id}`, body(b, { sortOrder: i })).catch(() => undefined);
    }
  }

  function remove(b: Banner) {
    if (window.confirm(`Delete “${b.title}”? This cannot be undone. (Use Hide to keep it for later.)`)) {
      void mutate('DELETE', `/api/admin/banners/${b.id}`).catch(() => undefined);
    }
  }

  function row(b: Banner, group: Banner[], i: number, label: string) {
    return (
      <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 sm:flex-nowrap">
        <span className="numeric grid size-8 shrink-0 place-items-center rounded-full bg-sand text-xs font-semibold text-content">{label}</span>
        <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas">
          <Image src={b.imageDesktop} alt="" fill sizes="96px" className="object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          {b.eyebrow && <span className="block text-xs text-faint">{b.eyebrow}</span>}
          <span className="block truncate text-sm font-medium text-content">{b.title}</span>
          <span className="block truncate text-xs text-muted">
            {b.ctaLabel ? `${b.ctaLabel} → ${b.ctaUrl ?? ''}` : 'No button'}
            {(b.startsAt || b.endsAt) && ` · ${b.startsAt ? formatDate(b.startsAt) : 'now'} → ${b.endsAt ? formatDate(b.endsAt) : 'no end'}`}
          </span>
        </div>
        <Badge tone={b.isActive ? 'success' : 'neutral'}>{b.isActive ? 'Showing' : 'Hidden'}</Badge>
        <div className="flex items-center gap-1 text-xs">
          <button type="button" disabled={busy || i === 0} onClick={() => void move(group, i, i - 1)} aria-label="Move earlier" className="grid size-8 cursor-pointer place-items-center rounded-lg border border-line text-muted hover:text-content disabled:opacity-30">↑</button>
          <button type="button" disabled={busy || i === group.length - 1} onClick={() => void move(group, i, i + 1)} aria-label="Move later" className="grid size-8 cursor-pointer place-items-center rounded-lg border border-line text-muted hover:text-content disabled:opacity-30">↓</button>
          <button type="button" disabled={busy} onClick={() => void mutate('PUT', `/api/admin/banners/${b.id}`, body(b, { isActive: !b.isActive })).catch(() => undefined)} className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-muted hover:text-content">{b.isActive ? 'Hide' : 'Show'}</button>
          <button type="button" onClick={() => startEdit(b)} className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-content hover:border-line-strong">Edit</button>
          <button type="button" disabled={busy} onClick={() => remove(b)} className="cursor-pointer px-2 py-1.5 text-muted hover:text-crimson">Delete</button>
        </div>
      </li>
    );
  }

  return (
    <>
      <PageHeading
        title="Banners"
        description="The slides at the top of the homepage, and the strips between sections"
        action={<Button onClick={open ? close : startNew}>{open ? 'Cancel' : 'New banner'}</Button>}
      />

      <Card className="mb-6 text-sm leading-relaxed text-muted">
        <p className="font-medium text-content">How the homepage carousel works</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Each banner in <span className="text-content">Homepage carousel</span> is one slide, shown in the order below, and the first one is what people see first.</li>
          <li><span className="text-content">Upload finished artwork</span> — the headline and button are part of the picture, so nothing is added on top. The whole picture is the link. Every slide is shown at the same size (wider than tall, 1.9 : 1), so a picture of another shape is cropped to fit. For the best result upload 1900 × 1000 px and keep headlines and buttons away from the edges.</li>
          <li>Hide a banner to take it off the site without deleting it. Give it start and end dates to schedule it (a festival offer, say). Changes show on the site within a minute or so.</li>
          <li>If every banner is hidden or deleted, the homepage falls back to a plain built-in headline.</li>
        </ul>
      </Card>

      {open && (
        <Card className="mb-6">
          <h2 className="mb-4 text-base font-semibold text-content">{editing ? 'Edit banner' : 'New banner'}</h2>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {!isCarousel && (
              <Field label="Small label above the headline">
                <input value={form.eyebrow} maxLength={40} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} placeholder="Electric tables" className={inputClass} />
              </Field>
            )}
            <Field
              label={isCarousel ? 'What the picture shows' : 'Headline'}
              hint={isCarousel ? 'Read out by screen readers and used by Google. Not shown on the page.' : undefined}
            >
              <input required value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={isCarousel ? 'Stop grooming on the floor — round rotating table' : undefined} className={inputClass} />
            </Field>
            {!isCarousel && (
              <Field label="Line under the headline">
                <input value={form.subtitle} maxLength={240} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className={inputClass} />
              </Field>
            )}
            <Field label="Where it goes">
              <select value={form.placement} disabled={Boolean(editing)} onChange={(e) => setForm({ ...form, placement: e.target.value })} className={selectClass}>
                <option value="hero">Homepage carousel</option>
                <option value="strip">Strip</option>
                <option value="category">Category</option>
                <option value="product">Product</option>
              </select>
            </Field>

            <div className="sm:col-span-2">
              <span className="eyebrow mb-2 block">Banner picture</span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas">
                  {form.imageDesktop && <Image src={form.imageDesktop} alt="" fill sizes="128px" className="object-contain" />}
                </div>
                <UploadButton token={token} folder="banners" label={form.imageDesktop ? 'Replace picture' : 'Upload picture'} onUploaded={(url) => setForm((f) => ({ ...f, imageDesktop: url }))} />
                <input
                  required value={form.imageDesktop} onChange={(e) => setForm({ ...form, imageDesktop: e.target.value })}
                  placeholder="…or paste an image address, or a path like /banners/slide.jpg" aria-label="Photo address" className={`${inputClass} min-w-0 flex-1`}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <span className="eyebrow mb-2 block">Separate phone version (optional)</span>
              <div className="flex flex-wrap items-center gap-3">
                <UploadButton token={token} folder="banners" label={form.imageMobile ? 'Replace phone photo' : 'Upload phone photo'} onUploaded={(url) => setForm((f) => ({ ...f, imageMobile: url }))} />
                <input value={form.imageMobile} onChange={(e) => setForm({ ...form, imageMobile: e.target.value })} placeholder="Leave empty to use the picture above on phones" aria-label="Phone photo address" className={`${inputClass} min-w-0 flex-1`} />
              </div>
            </div>

            {!isCarousel && (
              <Field label="Button text">
                <input value={form.ctaLabel} maxLength={40} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="Shop electric tables" className={inputClass} />
              </Field>
            )}
            <Field label={isCarousel ? 'Where the picture links to' : 'Button goes to'} hint="A page on the site, e.g. /collections/electric-lifting">
              <input value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="/collections/electric-lifting" className={inputClass} />
            </Field>
            <Field label="Starts" hint="Leave blank to go live at once">
              <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Ends" hint="Leave blank to run until you hide it">
              <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputClass} />
            </Field>

            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={busy}>{editing ? 'Save changes' : 'Create banner'}</Button>
              <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {error && <p role="alert" className="mb-4 text-sm text-crimson">{error}</p>}
      {loading ? (
        <div className="grid h-48 place-items-center"><Spinner className="text-muted" /></div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-content">Homepage carousel</h2>
            {slides.length === 0 ? (
              <p className="text-sm text-muted">No slides. The homepage will show the hero on its own. Create a banner to add one.</p>
            ) : (
              <ul className="space-y-2">
                {slides.map((b, i) => row(b, slides, i, String(i + 1)))}
              </ul>
            )}
          </section>
          {others.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-content">Other banners</h2>
              <ul className="space-y-2">
                {others.map((b) => {
                  const group = others.filter((o) => o.placement === b.placement);
                  return row(b, group, group.indexOf(b), b.placement.slice(0, 2).toUpperCase());
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
