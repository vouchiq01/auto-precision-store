'use client';

import { useEffect, useState } from 'react';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { Badge, Spinner } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Card, Field, PageHeading, inputClass } from '@/components/admin/ui';

interface CmsPage {
  id: string; slug: string; title: string; body: string;
  metaTitle: string | null; metaDescription: string | null;
  isPublished: boolean; updatedAt: string;
}

export default function AdminPagesPage() {
  const { data, loading, error, busy, mutate } = useAdminResource<{ items: CmsPage[] }>('/api/admin/pages');
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', body: '', metaDescription: '', isPublished: true });

  const editing = data?.items.find((page) => page.slug === editingSlug) ?? null;

  useEffect(() => {
    if (editing) {
      setDraft({
        title: editing.title,
        body: editing.body,
        metaDescription: editing.metaDescription ?? '',
        isPublished: editing.isPublished,
      });
    }
  }, [editing]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editingSlug) return;
    await mutate('PUT', `/api/admin/pages/${editingSlug}`, {
      slug: editingSlug,
      title: draft.title,
      body: draft.body,
      metaTitle: null,
      metaDescription: draft.metaDescription || null,
      isPublished: draft.isPublished,
    });
    setEditingSlug(null);
  }

  return (
    <>
      <PageHeading title="Pages" description="Policy and information pages" />

      {error && <p role="alert" className="mb-4 text-sm text-crimson-bright">{error}</p>}
      {loading ? (
        <div className="grid h-48 place-items-center"><Spinner className="text-steel" /></div>
      ) : editingSlug && editing ? (
        <Card>
          <form onSubmit={save} className="space-y-4">
            <p className="numeric text-xs text-steel-dim">/pages/{editingSlug}</p>

            <Field label="Title">
              <input required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputClass} />
            </Field>

            <Field
              label="Body"
              hint="Blank line between paragraphs. **text** makes it bold. HTML is not rendered, by design."
            >
              <textarea
                required
                rows={18}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                className="w-full rounded-xl border border-ink-line bg-ink px-4 py-3 text-sm leading-relaxed text-bone outline-none focus:border-bone"
              />
            </Field>

            <Field label="Meta description" hint="Shown in search results. Up to 170 characters.">
              <input
                maxLength={170}
                value={draft.metaDescription}
                onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value })}
                className={inputClass}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm text-steel">
              <input
                type="checkbox"
                checked={draft.isPublished}
                onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })}
                className="size-4 accent-[#CE2B2B]"
              />
              Published
            </label>

            <div className="flex gap-2">
              <Button type="submit" loading={busy}>Save page</Button>
              <Button type="button" variant="ghost" onClick={() => setEditingSlug(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data?.items.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => setEditingSlug(page.slug)}
                className="w-full rounded-2xl border border-ink-line bg-ink-raised p-5 text-left transition-colors hover:border-steel-dim"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-bone">{page.title}</span>
                  <Badge tone={page.isPublished ? 'success' : 'neutral'}>
                    {page.isPublished ? 'Live' : 'Draft'}
                  </Badge>
                </div>
                <p className="numeric mt-1 text-xs text-steel-dim">/pages/{page.slug}</p>
                <p className="mt-3 line-clamp-2 text-xs text-steel">{page.body.slice(0, 140)}…</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
