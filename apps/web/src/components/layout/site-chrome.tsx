'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { AuthProvider } from '@/providers/auth-provider';
import { CartProvider } from '@/providers/cart-provider';
import { SmoothScroll } from '@/components/motion/smooth-scroll';
import { Header } from './header';
import { Footer } from './footer';
import { CartDrawer } from './cart-drawer';
import { SignInProvider, useSignIn } from '@/providers/sign-in-provider';
import { SearchProvider } from '@/providers/search-provider';
import { WishlistProvider } from '@/providers/wishlist-provider';
import { MobileTabBar, useTabBarVisible } from './mobile-tab-bar';

/**
 * Everything that must be a client component, in one boundary.
 * Pages stay server components and can fetch on the server; only this shell
 * ships interactivity.
 *
 * The admin area shares the auth and cart providers — it needs the session —
 * but not the storefront chrome. Shop navigation, a cart drawer and smooth
 * scrolling all get in the way of a dense admin table, and the admin layout
 * brings its own sidebar.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <CartProvider>
        <SignInProvider>
          <WishlistProvider>
            <SearchProvider>
              <SmoothScroll>
                <ChromeInner>{children}</ChromeInner>
              </SmoothScroll>
            </SearchProvider>
          </WishlistProvider>
        </SignInProvider>
      </CartProvider>
    </AuthProvider>
  );
}

/** Split out so it sits BELOW SignInProvider and can therefore use it. */
function ChromeInner({ children }: { children: ReactNode }) {
  const { openSignIn } = useSignIn();
  const tabBarVisible = useTabBarVisible();
  return (
    <>
      <Header onSignIn={openSignIn} />
      {/* Room at the foot of the page for the phone tab bar, so it never sits
          on top of the footer's last line. */}
      <main id="main">{children}</main>
      {/* The phone tab bar covers the bottom 64px, so the room for it is under the footer (navy, so it
          reads as part of it), not between the last section and the footer. */}
      <div className={tabBarVisible ? 'bg-ink pb-16 lg:pb-0' : undefined}>
        <Footer />
      </div>
      <MobileTabBar />
      <CartDrawer />
    </>
  );
}
