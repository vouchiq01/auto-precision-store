'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';
import { useSearch } from '@/providers/search-provider';
import { useSignIn } from '@/providers/sign-in-provider';

/**
 * Phone-only bottom navigation: Home, Shop, Search, Cart, Account.
 *
 * Thumbs reach the bottom of a phone, not the top-right corner where a hamburger
 * lives, and the five things a shopper actually does are all here. It steps
 * aside where a page brings its own fixed bottom bar (the product page's
 * add-to-cart bar, the cart's total-and-checkout bar, checkout) rather than stacking two bars.
 */
const HIDDEN_ON = ['/products/', '/cart', '/checkout', '/order/'];

export function useTabBarVisible(): boolean {
  const pathname = usePathname();
  return !HIDDEN_ON.some((prefix) => pathname.startsWith(prefix));
}

export function MobileTabBar() {
  const pathname = usePathname();
  const visible = useTabBarVisible();
  const { user } = useAuth();
  const { cart, open: openCart } = useCart();
  const { openSearch } = useSearch();
  const { openSignIn } = useSignIn();

  if (!visible) return null;

  const count = cart?.itemCount ?? 0;
  const isShop = pathname.startsWith('/shop') || pathname.startsWith('/collections');

  const item = 'relative flex flex-1 cursor-pointer flex-col items-center gap-1 py-2 text-[0.6875rem] font-medium transition-colors';
  const tone = (active: boolean) => (active ? 'text-crimson' : 'text-muted');

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-14px_rgba(0,0,0,0.18)] backdrop-blur-xl lg:hidden"
    >
      <div className="flex">
        <Link href="/" className={cn(item, tone(pathname === '/'))}>
          <Icon active={pathname === '/'}><path d="M3.5 9.5L10 4l6.5 5.5V16h-4.25v-4h-4.5v4H3.5z" strokeLinejoin="round" /></Icon>
          Home
        </Link>
        <Link href="/shop" className={cn(item, tone(isShop))}>
          <Icon active={isShop}><path d="M3.5 4.5h5v5h-5zM11.5 4.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z" strokeLinejoin="round" /></Icon>
          Shop
        </Link>
        <button type="button" onClick={openSearch} className={cn(item, tone(false))}>
          <Icon active={false}><circle cx="9" cy="9" r="5.5" /><path d="M13.5 13.5L17 17" strokeLinecap="round" /></Icon>
          Search
        </button>
        <button type="button" onClick={openCart} className={cn(item, tone(false))}>
          <Icon active={false}>
            <path d="M4 6.5h12l-1 9.5H5l-1-9.5z" strokeLinejoin="round" />
            <path d="M7.25 6.5V5a2.75 2.75 0 0 1 5.5 0v1.5" strokeLinecap="round" />
          </Icon>
          Cart
          {count > 0 && (
            <span className="numeric absolute right-[calc(50%-1.5rem)] top-1 grid min-w-4 place-items-center rounded-full bg-crimson px-1 text-[0.625rem] font-semibold leading-4 text-white">
              {count}
            </span>
          )}
        </button>
        {user ? (
          <Link href="/account" className={cn(item, tone(pathname.startsWith('/account')))}>
            <Icon active={pathname.startsWith('/account')}><circle cx="10" cy="7" r="3" /><path d="M4 16.5c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5" strokeLinecap="round" /></Icon>
            Account
          </Link>
        ) : (
          <button type="button" onClick={openSignIn} className={cn(item, tone(false))}>
            <Icon active={false}><circle cx="10" cy="7" r="3" /><path d="M4 16.5c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5" strokeLinecap="round" /></Icon>
            Sign in
          </button>
        )}
      </div>
    </nav>
  );
}

function Icon({ children, active }: { children: ReactNode; active: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-[1.375rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
