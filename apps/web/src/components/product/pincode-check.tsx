'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Serviceability {
  serviceable: boolean;
  city: string | null;
  state: string | null;
  etaDaysMin: number | null;
  etaDaysMax: number | null;
  message: string;
  reason: 'serviceable' | 'not_serviceable' | 'unknown_pincode' | 'lookup_unavailable';
}

/* A pincode that does not exist is a mistake the shopper can fix, so it reads
   as an error. "We don't go there yet" is not their mistake, so it does not. */
const TONE: Record<Serviceability['reason'], string> = {
  serviceable: 'text-success',
  not_serviceable: 'text-warning',
  unknown_pincode: 'text-crimson',
  lookup_unavailable: 'text-muted',
};

/**
 * "Does it reach me, and when?" — the question every Indian shopper asks before
 * they will consider adding a ₹60,000 item to a cart. Answering it on the
 * product page rather than at checkout removes a real reason to leave.
 */
export function PincodeCheck() {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState<Serviceability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null); setResult(null);
    try {
      setResult(await apiFetch<Serviceability>('/api/pincode/check', {
        method: 'POST', body: { pincode },
      }));
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldError('pincode') ?? err.message) : 'Could not check that pincode.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line p-5">
      <p className="eyebrow mb-3">Delivery</p>
      <form onSubmit={check} className="flex gap-2">
        <input
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, '').slice(0, 6));
            /* Clear the previous verdict the moment the number changes, so a
               green "delivers to Bengaluru" can never sit under a pincode it
               was not about. */
            setResult(null); setError(null);
          }}
          inputMode="numeric"
          placeholder="Enter pincode"
          aria-label="Delivery pincode"
          className="numeric h-11 min-w-0 flex-1 rounded-full border border-line bg-canvas px-4 text-sm text-content outline-none focus:border-line-strong placeholder:text-faint"
        />
        <Button type="submit" variant="secondary" size="sm" loading={busy} disabled={pincode.length !== 6}>
          Check
        </Button>
      </form>

      {result && (
        <p
          role={result.reason === 'unknown_pincode' ? 'alert' : undefined}
          className={`mt-3 text-sm ${TONE[result.reason]}`}
        >
          {result.message}
        </p>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-crimson">{error}</p>}
    </div>
  );
}
