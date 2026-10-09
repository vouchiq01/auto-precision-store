'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartSummary } from '@aps/shared';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from './auth-provider';

interface CartContextValue {
  cart: CartSummary | null;
  loading: boolean;
  /** True while a mutation is in flight, so buttons can disable without a full reload. */
  mutating: boolean;
  error: string | null;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  /** Units added optimistically that the server has not confirmed yet. */
  pendingAdds: number;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  reload: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAdds, setPendingAdds] = useState(0);
  const { user, token, loading: authLoading } = useAuth();

  /* The token has to go on every cart call. apiFetch only sends an
     Authorization header when one is passed explicitly, so without this the
     server sees a guest on every request — the signed-in user's cart is never
     resolved, and the guest cart is never handed over to them. */
  const reload = useCallback(async () => {
    try {
      setCart(await apiFetch<CartSummary>('/api/cart', { token }));
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  /* Reload once auth settles, and again whenever the signed-in user changes:
     the guest cart is merged into the user's cart at sign-in, so the contents
     legitimately differ before and after. */
  useEffect(() => {
    if (authLoading) return;
    void reload();
  }, [authLoading, user?.id, token, reload]);

  /** Every mutation returns the authoritative cart, so there is no optimistic state to reconcile. */
  const mutate = useCallback(async (run: () => Promise<CartSummary>) => {
    setMutating(true);
    setError(null);
    try {
      setCart(await run());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const addItem = useCallback(async (variantId: string, quantity = 1) => {
    /* No setIsOpen here any more: the confirmation is the photograph flying to the
       Cart button (lib/fly-to-cart.ts). The drawer opens when Cart is tapped.

       The add takes a second or more on a phone connection, so the count goes up
       straight away (`pendingAdds`) and the server catches up; if it fails the
       count drops back and the caller shows why. */
    setPendingAdds((n) => n + quantity);
    try {
      await mutate(() => apiFetch<CartSummary>('/api/cart/items', {
        method: 'POST', token, body: { variantId, quantity },
      }));
    } finally {
      setPendingAdds((n) => Math.max(0, n - quantity));
    }
  }, [mutate, token]);

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    await mutate(() => apiFetch<CartSummary>(`/api/cart/items/${itemId}`, {
      method: 'PATCH', token, body: { quantity },
    }));
  }, [mutate, token]);

  const removeItem = useCallback(async (itemId: string) => {
    await mutate(() => apiFetch<CartSummary>(`/api/cart/items/${itemId}`, { method: 'DELETE', token }));
  }, [mutate, token]);

  const applyCoupon = useCallback(async (code: string) => {
    await mutate(() => apiFetch<CartSummary>('/api/cart/coupon', { method: 'POST', token, body: { code } }));
  }, [mutate, token]);

  const removeCoupon = useCallback(async () => {
    await mutate(() => apiFetch<CartSummary>('/api/cart/coupon', { method: 'DELETE', token }));
  }, [mutate, token]);

  const value = useMemo<CartContextValue>(() => ({
    cart, loading, mutating, error, isOpen, pendingAdds,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    addItem, updateItem, removeItem, applyCoupon, removeCoupon, reload,
  }), [cart, loading, mutating, error, isOpen, pendingAdds, addItem, updateItem, removeItem, applyCoupon, removeCoupon, reload]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}
