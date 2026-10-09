'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { ACCEPT, uploadPhoto } from '@/lib/upload';
import { Spinner } from '@/components/ui/primitives';
import { inputClass } from './ui';

export interface PhotoDraft { url: string; alt: string }

/**
 * Product photographs, uploaded straight from the admin.
 *
 * Drop files on the box (or click it); each is uploaded and appears as a tile.
 * The first tile is the main photo — the one on cards and in search. Tiles can be
 * moved, made the main one, given alt text and removed. Nothing is published until
 * the product is saved, which is the same rule as every other field on the form.
 */
export function PhotoUploader({
  photos, onChange, token, folder,
}: { photos: PhotoDraft[]; onChange: (next: PhotoDraft[]) => void; token: string | null; folder: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [address, setAddress] = useState('');

  /* Always read the latest list: several uploads finish at different times, and
     each appends to whatever is there now rather than to a stale copy. */
  const latest = useRef(photos);
  latest.current = photos;

  const visible = photos.filter((photo) => photo.url);

  async function handleFiles(files: FileList | File[]) {
    const list = [...files];
    if (list.length === 0) return;
    setErrors([]);
    setUploading((n) => n + list.length);

    for (const file of list) {
      try {
        const url = await uploadPhoto(file, token, folder);
        onChange([...latest.current.filter((photo) => photo.url), { url, alt: '' }]);
      } catch (error) {
        setErrors((current) => [...current, error instanceof Error ? error.message : 'The upload failed.']);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  const replace = (next: PhotoDraft[]) => onChange(next);
  const move = (from: number, to: number) => {
    const next = [...visible];
    const [item] = next.splice(from, 1);
    if (item) next.splice(to, 0, item);
    replace(next);
  };

  return (
    <div>
      <label
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFiles(event.dataTransfer.files); }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors',
          dragging ? 'border-crimson bg-crimson-tint' : 'border-line-strong bg-canvas hover:border-crimson',
        )}
      >
        <svg viewBox="0 0 24 24" className="size-7 text-crimson" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 16V5m0 0l-4 4m4-4l4 4" />
          <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
        </svg>
        <span className="text-sm font-medium text-content">Drop photos here, or click to choose</span>
        <span className="text-xs text-faint">JPEG, PNG or WebP. Big phone photos are shrunk automatically.</span>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => { if (event.target.files) void handleFiles(event.target.files); event.target.value = ''; }}
        />
      </label>

      {errors.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 rounded-xl bg-crimson-tint px-4 py-3 text-sm text-crimson-deep">
          {errors.map((message, i) => <li key={i}>{message}</li>)}
        </ul>
      )}

      {(visible.length > 0 || uploading > 0) && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((photo, i) => (
            <li key={photo.url} className="rounded-xl border border-line bg-surface p-2">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.alt || ''} className="size-full object-contain p-1.5" />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-amber px-1.5 py-0.5 text-[0.625rem] font-semibold text-ink">
                    Main photo
                  </span>
                )}
              </div>

              <input
                value={photo.alt}
                onChange={(event) => replace(visible.map((p, j) => (j === i ? { ...p, alt: event.target.value } : p)))}
                placeholder="Describe the photo (alt text)"
                aria-label={`Alt text for photo ${i + 1}`}
                className={cn(inputClass, 'mt-2 h-9 text-xs')}
              />

              <div className="mt-2 flex items-center justify-between gap-1 text-xs">
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move earlier"
                    className="grid size-7 cursor-pointer place-items-center rounded-md border border-line text-muted hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-30">←</button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === visible.length - 1} aria-label="Move later"
                    className="grid size-7 cursor-pointer place-items-center rounded-md border border-line text-muted hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-30">→</button>
                </span>
                <span className="flex items-center gap-2">
                  {i > 0 && (
                    <button type="button" onClick={() => move(i, 0)} className="cursor-pointer text-muted underline-offset-2 hover:text-content hover:underline">Make main</button>
                  )}
                  <button type="button" onClick={() => replace(visible.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`}
                    className="cursor-pointer text-muted hover:text-crimson">Remove</button>
                </span>
              </div>
            </li>
          ))}

          {Array.from({ length: uploading }, (_, i) => (
            <li key={`up-${i}`} className="grid aspect-square place-items-center rounded-xl border border-dashed border-line-strong bg-canvas text-muted">
              <span className="flex flex-col items-center gap-2 text-xs"><Spinner /> Uploading…</span>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-4 text-xs text-muted">
        <summary className="cursor-pointer select-none hover:text-content">Use a photo that is already online instead</summary>
        <div className="mt-2 flex gap-2">
          <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="https://… or /products/slug/01.jpg"
            aria-label="Image address" className={inputClass} />
          <button type="button" disabled={!address.trim()}
            onClick={() => { replace([...visible, { url: address.trim(), alt: '' }]); setAddress(''); }}
            className="shrink-0 cursor-pointer rounded-xl border border-line px-4 text-sm text-content hover:border-line-strong disabled:opacity-40">Add</button>
        </div>
      </details>
    </div>
  );
}

/** A compact "Upload" button for a single image field (the picture on a story block). */
export function UploadButton({
  onUploaded, token, folder, label = 'Upload',
}: { onUploaded: (url: string) => void; token: string | null; folder: string; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try { onUploaded(await uploadPhoto(file, token, folder)); }
    catch (err) { setError(err instanceof Error ? err.message : 'The upload failed.'); }
    finally { setBusy(false); }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" onClick={() => input.current?.click()} disabled={busy}
        className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-line px-4 text-sm text-content hover:border-line-strong disabled:opacity-60">
        {busy ? <Spinner /> : null}{busy ? 'Uploading…' : label}
      </button>
      <input ref={input} type="file" accept={ACCEPT} className="sr-only"
        onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ''; }} />
      {error && <span role="alert" className="mt-1 text-xs text-crimson">{error}</span>}
    </span>
  );
}
