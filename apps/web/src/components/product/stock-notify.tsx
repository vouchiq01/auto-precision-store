'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';

/** Back-in-stock capture. Out of stock should never be a dead end. */
export function StockNotify({ variantId }: { variantId: string }) {
  const [phone, setPhone] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (done) {
    return (
      <p className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
        We will let you know the moment it is back.
      </p>
    );
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true); setError(null);
        try {
          await apiFetch('/api/stock-notify', { method: 'POST', body: { variantId, phone } });
          setDone(true);
        } catch (err) {
          setError(err instanceof ApiError ? (err.fieldError('phone') ?? err.message) : 'Could not save that.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="numeric"
        placeholder="Your mobile number"
        aria-label="Mobile number for back-in-stock alert"
        className="numeric h-11 min-w-0 flex-1 rounded-full border border-line bg-canvas px-4 text-sm text-content outline-none focus:border-line-strong placeholder:text-faint"
      />
      <Button type="submit" variant="secondary" loading={busy} disabled={!phone.trim()}>
        Notify me
      </Button>
      {error && <p role="alert" className="text-sm text-crimson">{error}</p>}
    </form>
  );
}
