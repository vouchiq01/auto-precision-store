'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/primitives';
import { Field, inputClass } from '@/components/admin/ui';
import { Logo } from '@/components/layout/logo';

export default function AdminLoginPage() {
  const router = useRouter();
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      await adminLogin(email, password);
      router.replace('/admin');
    } catch (err) {
      // Deliberately does not distinguish "no such account" from "wrong
      // password" — that difference is how you enumerate staff accounts.
      setError(err instanceof ApiError ? err.message : 'Could not sign in.');
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-bone"><Logo /></div>
        <Eyebrow className="mt-6">Admin</Eyebrow>
        <h1 className="font-[family-name:--font-display] mt-2 text-3xl font-semibold tracking-[-0.02em] text-bone">
          Sign in
        </h1>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label="Email">
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>

          {error && <p role="alert" className="text-sm text-crimson-bright">{error}</p>}

          <Button type="submit" size="lg" loading={busy} className="w-full">Sign in</Button>
        </form>
      </div>
    </div>
  );
}
