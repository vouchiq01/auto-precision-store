'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api';
import { addErrorMessage, showCartMessage } from '@/lib/fly-to-cart';
import { useAuth } from '@/providers/auth-provider';
import { useSignIn } from '@/providers/sign-in-provider';

/**
 * The wishlist: which products the signed-in customer has hearted.
 *
 * Lives on the server (the `wishlists` table), so it follows the customer to a
 * phone. A guest tapping a heart is not turned away: the product is remembered,
 * the sign-in dialog opens, and the moment they are signed in it is saved —
 * "login should come" was the brief, and losing the tap they just made would be
 * the wrong end of it. If they close the dialog without signing in, the remembered
 * product is forgotten rather than surprising them with a heart on a later login.
 */

interface WishlistContextValue {
  ids: ReadonlySet<string>;
  count: number;
  has: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const { openSignIn, signInOpen } = useSignIn();
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  const pending = useRef<string | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const signedIn = Boolean(user && token);

  /* Load the customer's hearts on sign-in; clear them on sign-out. */
  useEffect(() => {
    if (!signedIn) { setIds(new Set()); return; }
    let cancelled = false;
    apiFetch<{ ids: string[] }>('/api/account/wishlist/ids', { token: tokenRef.current })
      .then((result) => { if (!cancelled) setIds(new Set(result.ids)); })
      .catch(() => { /* hearts simply stay empty; the next toggle will report a real problem */ });
    return () => { cancelled = true; };
  }, [signedIn, user?.id]);

  const set = useCallback(async (productId: string, on: boolean) => {
    setIds((current) => { const next = new Set(current); if (on) next.add(productId); else next.delete(productId); return next; });
    try {
      await apiFetch(`/api/account/wishlist/${productId}`, { method: on ? 'POST' : 'DELETE', token: tokenRef.current });
      if (on) showCartMessage('Saved to your wishlist');
    } catch (error) {
      setIds((current) => { const next = new Set(current); if (on) next.delete(productId); else next.add(productId); return next; });
      showCartMessage(addErrorMessage(error));
    }
  }, []);

  const toggle = useCallback(async (productId: string) => {
    if (!signedIn) {
      pending.current = productId;
      openSignIn();
      return;
    }
    await set(productId, !ids.has(productId));
  }, [signedIn, ids, openSignIn, set]);

  /* Just signed in with a heart waiting: save it. */
  useEffect(() => {
    if (signedIn && pending.current) {
      const productId = pending.current;
      pending.current = null;
      if (!ids.has(productId)) void set(productId, true);
    }
  }, [signedIn, ids, set]);

  /* Dialog closed and still nobody signed in: forget the waiting heart. */
  useEffect(() => {
    if (signInOpen) return;
    const timer = setTimeout(() => { if (!tokenRef.current) pending.current = null; }, 1000);
    return () => clearTimeout(timer);
  }, [signInOpen]);

  const value = useMemo<WishlistContextValue>(() => ({
    ids, count: ids.size, has: (productId) => ids.has(productId), toggle,
  }), [ids, toggle]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return context;
}
