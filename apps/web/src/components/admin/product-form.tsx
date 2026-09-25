'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/primitives';
import { Card, Field, PageHeading, inputClass, selectClass } from './ui';

/* The form works in RUPEES and converts to paise at the boundary. Asking an
   admin to type 11240000 to mean ₹1,12,400 is a data-entry bug waiting to
   happen on a catalogue where a misplaced zero is ₹10 lakh. */
const toPaise = (rupees: string) => Math.round(Number(rupees || 0) * 100);
const toRupees = (paise: number | null | undefined) => (paise ? String(paise / 100) : '');

interface VariantDraft {
  id?: string; sku: string; optionName: string; optionValue: string;
  priceDeltaRupees: string; stockQty: string; weightG: string; hexColour: string; isActive: boolean;
}

interface SpecDraft { group: string; label: string; value: string }
interface StatDraft { value: string; label: string }
interface FeatureDraft {
  eyebrow: string; title: string; body: string; mediaUrl: string;
  layout: 'media_right' | 'media_left' | 'media_full' | 'stat_row' | 'quote';
  stats: StatDraft[];
}
interface FaqDraft { question: string; answer: string }
interface ImageDraft { url: string; alt: string }

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const { token } = useAuth();

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [form, setForm] = useState({
    slug: '', sku: '', name: '', tagline: '', summary: '', description: '',
    categoryId: '', brand: 'Auto Precision',
    basePriceRupees: '', compareAtPriceRupees: '',
    status: 'draft', hsnCode: '9403', taxRateBps: '1800',
    weightG: '', lengthMm: '', widthMm: '', heightMinMm: '', heightMaxMm: '',
    loadCapacityKg: '', warrantyMonths: '12',
    badges: '', isFeatured: false,
  });
  const [variants, setVariants] = useState<VariantDraft[]>([
    { sku: '', optionName: 'Finish', optionValue: '', priceDeltaRupees: '0', stockQty: '0', weightG: '', hexColour: '', isActive: true },
  ]);
  const [specs, setSpecs] = useState<SpecDraft[]>([{ group: 'General', label: '', value: '' }]);
  const [faqs, setFaqs] = useState<FaqDraft[]>([]);
  const [features, setFeatures] = useState<FeatureDraft[]>([]);
  const [images, setImages] = useState<ImageDraft[]>([{ url: '', alt: '' }]);

  useEffect(() => {
    if (!token) return;
    void apiFetch<{ items: { id: string; name: string }[] }>('/api/admin/products/meta/categories', { token })
      .then((result) => setCategories(result.items))
      .catch(() => setCategories([]));
  }, [token]);

  useEffect(() => {
    if (!productId || !token) return;
    void apiFetch<Record<string, any>>(`/api/admin/products/${productId}`, { token })
      .then((product) => {
        setForm({
          slug: product.slug, sku: product.sku, name: product.name,
          tagline: product.tagline ?? '', summary: product.summary ?? '', description: product.description ?? '',
          categoryId: product.categoryId, brand: product.brand,
          basePriceRupees: toRupees(product.basePrice),
          compareAtPriceRupees: toRupees(product.compareAtPrice),
          status: product.status, hsnCode: product.hsnCode, taxRateBps: String(product.taxRateBps),
          weightG: String(product.weightG ?? ''), lengthMm: String(product.lengthMm ?? ''),
          widthMm: String(product.widthMm ?? ''), heightMinMm: String(product.heightMinMm ?? ''),
          heightMaxMm: String(product.heightMaxMm ?? ''), loadCapacityKg: String(product.loadCapacityKg ?? ''),
          warrantyMonths: String(product.warrantyMonths), badges: (product.badges ?? []).join(', '),
          isFeatured: product.isFeatured,
        });
        setVariants((product.variants ?? []).map((v: any) => ({
          id: v.id, sku: v.sku, optionName: v.optionName, optionValue: v.optionValue,
          priceDeltaRupees: toRupees(v.priceDelta) || '0', stockQty: String(v.stockQty),
          weightG: String(v.weightG ?? ''), hexColour: v.hexColour ?? '', isActive: v.isActive,
        })));
        setSpecs((product.specs ?? []).map((s: any) => ({ group: s.group, label: s.label, value: s.value })));
        setFaqs((product.faqs ?? []).map((f: any) => ({ question: f.question, answer: f.answer })));
        setFeatures((product.features ?? []).map((f: any) => ({
          eyebrow: f.eyebrow ?? '', title: f.title, body: f.body ?? '',
          mediaUrl: f.mediaUrl ?? '', layout: f.layout, stats: f.stats ?? [],
        })));
        setImages((product.images ?? []).map((i: any) => ({ url: i.url, alt: i.alt })));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load that product.'))
      .finally(() => setLoading(false));
  }, [productId, token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(null); setFieldErrors({});

    const payload = {
      slug: form.slug.trim(), sku: form.sku.trim(), name: form.name.trim(),
      tagline: form.tagline || null, summary: form.summary || null, description: form.description || null,
      categoryId: form.categoryId, brand: form.brand,
      basePrice: toPaise(form.basePriceRupees),
      compareAtPrice: form.compareAtPriceRupees ? toPaise(form.compareAtPriceRupees) : null,
      status: form.status, hsnCode: form.hsnCode, taxRateBps: Number(form.taxRateBps),
      weightG: Number(form.weightG || 0),
      lengthMm: form.lengthMm ? Number(form.lengthMm) : null,
      widthMm: form.widthMm ? Number(form.widthMm) : null,
      heightMinMm: form.heightMinMm ? Number(form.heightMinMm) : null,
      heightMaxMm: form.heightMaxMm ? Number(form.heightMaxMm) : null,
      loadCapacityKg: form.loadCapacityKg ? Number(form.loadCapacityKg) : null,
      warrantyMonths: Number(form.warrantyMonths || 12),
      badges: form.badges.split(',').map((b) => b.trim()).filter(Boolean),
      isFeatured: form.isFeatured,
      sortOrder: 0, metaTitle: null, metaDescription: form.summary?.slice(0, 165) || null,
      variants: variants.filter((v) => v.sku && v.optionValue).map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        sku: v.sku.trim(), optionName: v.optionName, optionValue: v.optionValue,
        priceDelta: toPaise(v.priceDeltaRupees), stockQty: Number(v.stockQty || 0),
        lowStockThreshold: 2, weightG: Number(v.weightG || 0),
        hexColour: v.hexColour || null, isActive: v.isActive,
      })),
      images: images.filter((i) => i.url).map((i, index) => ({
        url: i.url.trim(), alt: i.alt, sortOrder: index, isPrimary: index === 0, variantId: null,
      })),
      specs: specs.filter((s) => s.label && s.value).map((s, index) => ({ ...s, sortOrder: index })),
      features: features.filter((f) => f.title).map((f, index) => ({
        eyebrow: f.eyebrow || null,
        title: f.title,
        body: f.body || null,
        mediaUrl: f.mediaUrl || null,
        mediaAlt: f.title,
        layout: f.layout,
        stats: f.stats.filter((stat) => stat.value && stat.label),
        sortOrder: index,
      })),
      faqs: faqs.filter((f) => f.question && f.answer).map((f, index) => ({ ...f, sortOrder: index })),
    };

    try {
      if (productId) await apiFetch(`/api/admin/products/${productId}`, { method: 'PUT', body: payload, token });
      else await apiFetch('/api/admin/products', { method: 'POST', body: payload, token });
      router.push('/admin/products');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.errors ?? {});
      } else setError('Could not save.');
      setSaving(false);
    }
  }

  if (loading) return <div className="grid h-64 place-items-center"><Spinner className="text-muted" /></div>;

  const text = (key: keyof typeof form, label: string, props: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {}) => (
    <Field label={label} error={fieldErrors[key]?.[0]}>
      <input
        value={String(form[key])}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={inputClass}
        {...props}
      />
    </Field>
  );

  return (
    <form onSubmit={submit}>
      <PageHeading
        title={productId ? 'Edit product' : 'New product'}
        action={
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push('/admin/products')}>Cancel</Button>
            <Button type="submit" loading={saving}>{productId ? 'Save changes' : 'Create product'}</Button>
          </div>
        }
      />

      {error && <p role="alert" className="mb-4 rounded-xl border border-crimson/30 bg-crimson/5 px-4 py-3 text-sm text-crimson">{error}</p>}

      <div className="space-y-6">
        <Card>
          <h2 className="eyebrow mb-4">Basics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('name', 'Name', { required: true })}
            {text('slug', 'URL slug', { required: true, placeholder: 'apex-e9-electric-grooming-table' })}
            {text('sku', 'SKU', { required: true })}
            <Field label="Category" error={fieldErrors.categoryId?.[0]}>
              <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={selectClass}>
                <option value="">Choose a category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            {text('tagline', 'Tagline', { placeholder: 'The one you buy once.' })}
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          </div>

          <div className="mt-4 grid gap-4">
            <Field label="Summary" hint="One paragraph, used on cards and in search results">
              <textarea rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
                className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-content outline-none focus:border-line-strong" />
            </Field>
            <Field label="Description" hint="Blank line between paragraphs">
              <textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm leading-relaxed text-content outline-none focus:border-line-strong" />
            </Field>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="size-4 accent-[#CE2B2B]" />
            Feature on the homepage
          </label>
        </Card>

        <Card>
          <h2 className="eyebrow mb-4">Price &amp; tax</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            {text('basePriceRupees', 'Selling price (₹)', { required: true, type: 'number', step: 'any', min: 0 })}
            {text('compareAtPriceRupees', 'Compare-at price (₹)', { type: 'number', step: 'any', min: 0 })}
            {text('hsnCode', 'HSN code')}
            <Field label="GST rate">
              <select value={form.taxRateBps} onChange={(e) => setForm({ ...form, taxRateBps: e.target.value })} className={selectClass}>
                <option value="0">0%</option><option value="500">5%</option>
                <option value="1200">12%</option><option value="1800">18%</option><option value="2800">28%</option>
              </select>
            </Field>
          </div>
          <p className="mt-2 text-xs text-faint">Prices are GST-inclusive, as shown to the customer.</p>
        </Card>

        <Card>
          <h2 className="eyebrow mb-4">Physical</h2>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {text('weightG', 'Weight (g)', { type: 'number', min: 0 })}
            {text('lengthMm', 'Length (mm)', { type: 'number', min: 0 })}
            {text('widthMm', 'Width (mm)', { type: 'number', min: 0 })}
            {text('heightMinMm', 'Height min (mm)', { type: 'number', min: 0 })}
            {text('heightMaxMm', 'Height max (mm)', { type: 'number', min: 0 })}
            {text('loadCapacityKg', 'Load (kg)', { type: 'number', min: 0 })}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {text('warrantyMonths', 'Warranty (months)', { type: 'number', min: 0 })}
            {text('badges', 'Badges', { placeholder: 'Flagship, 3-year frame' })}
          </div>
          <p className="mt-2 text-xs text-faint">Weight drives the freight slab, so keep it accurate.</p>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="eyebrow">Variants</h2>
            <Button type="button" size="sm" variant="secondary" onClick={() =>
              setVariants([...variants, { sku: '', optionName: 'Finish', optionValue: '', priceDeltaRupees: '0', stockQty: '0', weightG: '', hexColour: '', isActive: true }])
            }>Add variant</Button>
          </div>

          <div className="space-y-3">
            {variants.map((variant, i) => (
              <div key={i} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-6">
                <input placeholder="SKU" value={variant.sku}
                  onChange={(e) => setVariants(variants.map((v, j) => j === i ? { ...v, sku: e.target.value } : v))} className={inputClass} />
                <input placeholder="Option name" value={variant.optionName}
                  onChange={(e) => setVariants(variants.map((v, j) => j === i ? { ...v, optionName: e.target.value } : v))} className={inputClass} />
                <input placeholder="Option value" value={variant.optionValue}
                  onChange={(e) => setVariants(variants.map((v, j) => j === i ? { ...v, optionValue: e.target.value } : v))} className={inputClass} />
                <input placeholder="± ₹" type="number" value={variant.priceDeltaRupees}
                  onChange={(e) => setVariants(variants.map((v, j) => j === i ? { ...v, priceDeltaRupees: e.target.value } : v))} className={inputClass} />
                <input placeholder="Stock" type="number" min={0} value={variant.stockQty}
                  onChange={(e) => setVariants(variants.map((v, j) => j === i ? { ...v, stockQty: e.target.value } : v))} className={inputClass} />
                <div className="flex gap-2">
                  <input placeholder="#RRGGBB" value={variant.hexColour}
                    onChange={(e) => setVariants(variants.map((v, j) => j === i ? { ...v, hexColour: e.target.value } : v))} className={inputClass} />
                  <button type="button" onClick={() => setVariants(variants.filter((_, j) => j !== i))}
                    aria-label="Remove variant" className="shrink-0 px-2 text-muted hover:text-crimson">✕</button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="eyebrow">Images</h2>
            <Button type="button" size="sm" variant="secondary" onClick={() => setImages([...images, { url: '', alt: '' }])}>Add image</Button>
          </div>
          <p className="mb-3 text-xs text-faint">The first image is the one used on cards and in search results.</p>
          <div className="space-y-2">
            {images.map((image, i) => (
              <div key={i} className="flex gap-2">
                <input placeholder="/products/slug/01.jpg or a full URL" value={image.url}
                  onChange={(e) => setImages(images.map((img, j) => j === i ? { ...img, url: e.target.value } : img))} className={inputClass} />
                <input placeholder="Alt text" value={image.alt}
                  onChange={(e) => setImages(images.map((img, j) => j === i ? { ...img, alt: e.target.value } : img))} className={inputClass} />
                <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                  aria-label="Remove image" className="shrink-0 px-2 text-muted hover:text-crimson">✕</button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="eyebrow">Specifications</h2>
            <Button type="button" size="sm" variant="secondary" onClick={() => setSpecs([...specs, { group: 'General', label: '', value: '' }])}>Add spec</Button>
          </div>
          <div className="space-y-2">
            {specs.map((spec, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr_1fr_auto]">
                <input placeholder="Group" value={spec.group}
                  onChange={(e) => setSpecs(specs.map((s, j) => j === i ? { ...s, group: e.target.value } : s))} className={inputClass} />
                <input placeholder="Label" value={spec.label}
                  onChange={(e) => setSpecs(specs.map((s, j) => j === i ? { ...s, label: e.target.value } : s))} className={inputClass} />
                <input placeholder="Value" value={spec.value}
                  onChange={(e) => setSpecs(specs.map((s, j) => j === i ? { ...s, value: e.target.value } : s))} className={inputClass} />
                <button type="button" onClick={() => setSpecs(specs.filter((_, j) => j !== i))}
                  aria-label="Remove spec" className="px-2 text-muted hover:text-crimson">✕</button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="eyebrow">Story blocks</h2>
            <Button type="button" size="sm" variant="secondary" onClick={() =>
              setFeatures([...features, { eyebrow: '', title: '', body: '', mediaUrl: '', layout: 'media_right', stats: [] }])
            }>Add block</Button>
          </div>
          <p className="mb-3 text-xs text-faint">
            These are the scrolling sections down the product page. Order here is the order on the page.
          </p>

          <div className="space-y-3">
            {features.map((feature, i) => (
              <div key={i} className="rounded-xl border border-line p-3">
                <div className="grid gap-2 sm:grid-cols-[8rem_1fr_10rem_auto]">
                  <input placeholder="Eyebrow" value={feature.eyebrow}
                    onChange={(e) => setFeatures(features.map((f, j) => j === i ? { ...f, eyebrow: e.target.value } : f))} className={inputClass} />
                  <input placeholder="Title" value={feature.title}
                    onChange={(e) => setFeatures(features.map((f, j) => j === i ? { ...f, title: e.target.value } : f))} className={inputClass} />
                  <select value={feature.layout}
                    onChange={(e) => setFeatures(features.map((f, j) => j === i ? { ...f, layout: e.target.value as FeatureDraft['layout'] } : f))}
                    className={selectClass}>
                    <option value="media_right">Image right</option>
                    <option value="media_left">Image left</option>
                    <option value="media_full">Full-width image</option>
                    <option value="stat_row">Row of numbers</option>
                    <option value="quote">Pull quote</option>
                  </select>
                  <button type="button" onClick={() => setFeatures(features.filter((_, j) => j !== i))}
                    aria-label="Remove block" className="px-2 text-muted hover:text-crimson">✕</button>
                </div>

                <textarea placeholder="Body copy" rows={3} value={feature.body}
                  onChange={(e) => setFeatures(features.map((f, j) => j === i ? { ...f, body: e.target.value } : f))}
                  className="mt-2 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-content outline-none focus:border-line-strong" />

                <input placeholder="Image URL" value={feature.mediaUrl}
                  onChange={(e) => setFeatures(features.map((f, j) => j === i ? { ...f, mediaUrl: e.target.value } : f))}
                  className={`${inputClass} mt-2`} />

                <div className="mt-3 rounded-lg border border-line p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-faint">Numbers (up to 4)</span>
                    {feature.stats.length < 4 && (
                      <button type="button"
                        onClick={() => setFeatures(features.map((f, j) => j === i ? { ...f, stats: [...f.stats, { value: '', label: '' }] } : f))}
                        className="text-xs text-muted hover:text-content">+ add</button>
                    )}
                  </div>
                  {feature.stats.map((stat, k) => (
                    <div key={k} className="mb-2 flex gap-2">
                      <input placeholder="120kg" value={stat.value}
                        onChange={(e) => setFeatures(features.map((f, j) => j === i
                          ? { ...f, stats: f.stats.map((st, m) => m === k ? { ...st, value: e.target.value } : st) } : f))}
                        className={`${inputClass} h-9`} />
                      <input placeholder="Load capacity" value={stat.label}
                        onChange={(e) => setFeatures(features.map((f, j) => j === i
                          ? { ...f, stats: f.stats.map((st, m) => m === k ? { ...st, label: e.target.value } : st) } : f))}
                        className={`${inputClass} h-9`} />
                      <button type="button"
                        onClick={() => setFeatures(features.map((f, j) => j === i ? { ...f, stats: f.stats.filter((_, m) => m !== k) } : f))}
                        aria-label="Remove number" className="px-2 text-muted hover:text-crimson">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="eyebrow">FAQs</h2>
            <Button type="button" size="sm" variant="secondary" onClick={() => setFaqs([...faqs, { question: '', answer: '' }])}>Add FAQ</Button>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-line p-3">
                <div className="flex gap-2">
                  <input placeholder="Question" value={faq.question}
                    onChange={(e) => setFaqs(faqs.map((f, j) => j === i ? { ...f, question: e.target.value } : f))} className={inputClass} />
                  <button type="button" onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}
                    aria-label="Remove FAQ" className="shrink-0 px-2 text-muted hover:text-crimson">✕</button>
                </div>
                <textarea placeholder="Answer" rows={3} value={faq.answer}
                  onChange={(e) => setFaqs(faqs.map((f, j) => j === i ? { ...f, answer: e.target.value } : f))}
                  className="mt-2 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-content outline-none focus:border-line-strong" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </form>
  );
}
