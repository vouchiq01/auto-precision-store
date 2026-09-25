'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/primitives';

export default function EnquiryPage() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', businessName: '', city: '', quantity: '', message: '',
  });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null); setFieldErrors({});
    try {
      await apiFetch('/api/enquiries', {
        method: 'POST',
        body: {
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          businessName: form.businessName || null,
          city: form.city || null,
          quantity: form.quantity ? Number(form.quantity) : null,
          message: form.message,
        },
      });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.errors ?? {});
      } else setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const field = (name: keyof typeof form, label: string, props: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {}) => (
    <label className="block">
      <span className="eyebrow mb-2 block">{label}</span>
      <input
        value={form[name]}
        onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
        className={cn(
          'h-12 w-full rounded-xl border bg-ink px-4 text-bone outline-none placeholder:text-steel-dim',
          fieldErrors[name] ? 'border-crimson' : 'border-ink-line focus:border-bone',
        )}
        {...props}
      />
      {fieldErrors[name] && <span className="mt-1 block text-xs text-crimson-bright">{fieldErrors[name]?.[0]}</span>}
    </label>
  );

  if (sent) {
    return (
      <div className="shell pt-28 md:pt-36">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Received</Eyebrow>
          <h1 className="display-lg mt-4 text-bone">Thank you<span className="text-crimson">.</span></h1>
          <p className="lede mx-auto mt-6">
            We will call you back within one working day. If it is urgent, ring us directly —
            the number is in the footer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="shell pt-28 md:pt-36">
      <div className="mx-auto max-w-2xl">
        <Eyebrow>Bulk & dealer enquiry</Eyebrow>
        <h1 className="display-lg mt-4 text-bone">Tell us what you are fitting out<span className="text-crimson">.</span></h1>
        <p className="lede mt-6">
          Trade pricing starts at two stations. The more you tell us about what you groom and the
          room you have, the more useful our answer will be — including when the cheaper table is
          the right one.
        </p>

        <form onSubmit={submit} className="mt-12 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {field('name', 'Your name', { required: true, autoComplete: 'name' })}
            {field('phone', 'Mobile number', { required: true, inputMode: 'numeric', autoComplete: 'tel-national' })}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {field('email', 'Email (optional)', { type: 'email', autoComplete: 'email' })}
            {field('businessName', 'Salon or business (optional)')}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {field('city', 'City (optional)')}
            {field('quantity', 'How many stations? (optional)', { inputMode: 'numeric' })}
          </div>

          <label className="block">
            <span className="eyebrow mb-2 block">What do you need?</span>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Four stations for a new salon in Koramangala. Mostly small breeds, one large. Room is 4 × 5 m."
              className={cn(
                'w-full rounded-xl border bg-ink px-4 py-3 text-bone outline-none placeholder:text-steel-dim',
                fieldErrors.message ? 'border-crimson' : 'border-ink-line focus:border-bone',
              )}
            />
            {fieldErrors.message && <span className="mt-1 block text-xs text-crimson-bright">{fieldErrors.message[0]}</span>}
          </label>

          {error && <p role="alert" className="text-sm text-crimson-bright">{error}</p>}

          <Button type="submit" size="lg" loading={busy} className="w-full sm:w-auto">
            Send enquiry
          </Button>
        </form>
      </div>
    </div>
  );
}
