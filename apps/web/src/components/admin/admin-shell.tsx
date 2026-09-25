'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/auth-provider';
import { Logo } from '@/components/layout/logo';
import { Spinner } from '@/components/ui/primitives';

const NAV = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/banners', label: 'Banners' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/enquiries', label: 'Enquiries' },
  { href: '/admin/pages', label: 'Pages' },
];

/**
 * Admin chrome and the client-side guard.
 *
 * The guard here is a convenience, not the security boundary: every admin
 * endpoint independently requires an admin role server-side, so a user who
 * bypasses this UI still gets 403s from the API.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin && pathname !== '/admin/login') {
      router.replace('/admin/login');
    }
  }, [loading, isAdmin, pathname, router]);

  if (pathname === '/admin/login') return <>{children}</>;

  if (loading) {
    return <div className="grid min-h-dvh place-items-center"><Spinner className="text-steel" /></div>;
  }

  if (!isAdmin) {
    return <div className="grid min-h-dvh place-items-center text-sm text-steel">Redirecting to sign in…</div>;
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 border-r border-ink-line lg:block">
        <div className="sticky top-0 flex h-dvh flex-col p-5">
          <Link href="/admin" className="text-bone"><Logo /></Link>
          <p className="eyebrow mt-1.5">Admin</p>

          <nav className="mt-8 flex-1 space-y-0.5" aria-label="Admin sections">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm transition-colors',
                    active ? 'bg-ink-panel text-bone' : 'text-steel hover:bg-ink-raised hover:text-bone',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="rule pt-4">
            <p className="truncate text-xs text-steel-dim">{user?.email}</p>
            <div className="mt-2 flex gap-3 text-xs">
              <Link href="/" className="text-steel transition-colors hover:text-bone">View store</Link>
              <button type="button" onClick={() => void logout()} className="text-steel transition-colors hover:text-crimson-bright">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile nav */}
        <div className="flex gap-1 overflow-x-auto border-b border-ink-line px-4 py-3 lg:hidden">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors',
                  active ? 'bg-bone text-ink' : 'text-steel',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
