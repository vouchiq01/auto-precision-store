'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * Phone + OTP sign-in.
 *
 * Two steps, one dialog. The OTP field is a single input rather than six boxes:
 * six boxes look impressive and are a genuine nuisance to paste into, and on
 * Android the SMS autofill lands in one field anyway.
 */
export function SignInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      // Reset on close so reopening never shows a stale code or error.
      setStep('phone'); setCode(''); setError(null); setDevCode(null); setBusy(false);
      return;
    }
    const timer = setTimeout(() => firstFieldRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [open, step]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  async function submitPhone(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      const result = await requestOtp(phone);
      setDevCode(result.devCode ?? null);
      setStep('code');
      setSecondsLeft(30);
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldError('phone') ?? err.message) : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      await verifyOtp(phone, code, fullName.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-title"
    >
      <button
        type="button"
        aria-label="Close sign in"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        className={cn(
          'relative w-full max-w-md rounded-t-3xl border border-line bg-surface p-7 sm:rounded-3xl sm:p-9',
          'animate-[slideUp_0.45s_var(--ease-out-expo)]',
        )}
      >
        <Eyebrow>{step === 'phone' ? 'Sign in' : 'Verify'}</Eyebrow>
        <h2 id="signin-title" className="display-sm mt-3 text-content">
          {step === 'phone' ? 'Your phone number' : 'Enter the code'}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {step === 'phone'
            ? 'We will text you a six-digit code. No password to remember.'
            : `Sent to ${phone}.`}
        </p>

        {step === 'phone' ? (
          <form onSubmit={submitPhone} className="mt-7 space-y-4">
            <label className="block">
              <span className="eyebrow mb-2 block">Mobile number</span>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-4 focus-within:border-line-strong">
                <span className="numeric text-sm text-muted">+91</span>
                <input
                  ref={firstFieldRef}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  className="numeric h-12 w-full bg-transparent text-content outline-none placeholder:text-faint"
                />
              </div>
            </label>

            {error && <p role="alert" className="text-sm text-crimson">{error}</p>}

            <Button type="submit" size="lg" loading={busy} className="w-full">
              Send code
            </Button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-7 space-y-4">
            {devCode && (
              <p className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
                Development mode — your code is <strong className="numeric">{devCode}</strong>
              </p>
            )}

            <label className="block">
              <span className="eyebrow mb-2 block">Six-digit code</span>
              <input
                ref={firstFieldRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="numeric h-12 w-full rounded-xl border border-line bg-canvas px-4 text-center text-2xl tracking-[0.5em] text-content outline-none focus:border-line-strong placeholder:text-faint"
              />
            </label>

            <label className="block">
              <span className="eyebrow mb-2 block">Your name <span className="normal-case tracking-normal text-faint">(first time only)</span></span>
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Priya Raghavan"
                className="h-12 w-full rounded-xl border border-line bg-canvas px-4 text-content outline-none focus:border-line-strong placeholder:text-faint"
              />
            </label>

            {error && <p role="alert" className="text-sm text-crimson">{error}</p>}

            <Button type="submit" size="lg" loading={busy} className="w-full">
              Verify and continue
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep('phone')} className="text-muted transition-colors hover:text-content">
                Change number
              </button>
              <button
                type="button"
                disabled={secondsLeft > 0 || busy}
                onClick={() => { void submitPhone(new Event('submit') as unknown as React.FormEvent); }}
                className="text-muted transition-colors hover:text-content disabled:opacity-40"
              >
                {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-sand hover:text-content"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
