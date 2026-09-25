'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PageHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-[family-name:--font-display] text-3xl font-semibold tracking-[-0.02em] text-content">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-line bg-surface p-5', className)}>{children}</div>;
}

export function StatCard({ label, value, delta, hint }: { label: string; value: string; delta?: number; hint?: string }) {
  return (
    <Card>
      <p className="eyebrow">{label}</p>
      <p className="numeric mt-2 font-[family-name:--font-display] text-3xl font-semibold text-content">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span className={cn('numeric', delta >= 0 ? 'text-success' : 'text-crimson')}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="text-faint">{hint}</span>}
      </div>
    </Card>
  );
}

/** Horizontally scrollable on small screens rather than squashing columns. */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[42rem] text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {head.map((label) => (
              <th key={label} scope="col" className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-faint">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Field({
  label, children, error, hint,
}: { label: string; children: ReactNode; error?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-crimson">{error}</span>}
    </label>
  );
}

export const inputClass =
  'h-11 w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-content outline-none focus:border-line-strong placeholder:text-faint';

export const selectClass =
  'h-11 w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-content outline-none focus:border-line-strong';
