'use client';

import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '@/providers/auth-provider';
import { CartProvider } from '@/providers/cart-provider';
import { SmoothScroll } from '@/components/motion/smooth-scroll';
import { Header } from './header';
import { Footer } from './footer';
import { CartDrawer } from './cart-drawer';
import { SignInDialog } from './sign-in-dialog';

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
  const [signInOpen, setSignInOpen] = useState(false);
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
        <SmoothScroll>
          <Header onSignIn={() => setSignInOpen(true)} />
          <main id="main">{children}</main>
          <Footer />
          <CartDrawer />
          <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
        </SmoothScroll>
      </CartProvider>
    </AuthProvider>
  );
}
