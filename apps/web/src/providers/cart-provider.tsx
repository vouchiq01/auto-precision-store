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
  const { user, loading: authLoading } = useAuth();

  const reload = useCallback(async () => {
    try {
      setCart(await apiFetch<CartSummary>('/api/cart'));
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Reload once auth settles, and again whenever the signed-in user changes:
     the guest cart is merged into the user's cart at sign-in, so the contents
     legitimately differ before and after. */
  useEffect(() => {
    if (authLoading) return;
    void reload();
  }, [authLoading, user?.id, reload]);

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
    await mutate(() => apiFetch<CartSummary>('/api/cart/items', {
      method: 'POST', body: { variantId, quantity },
    }));
    setIsOpen(true);
  }, [mutate]);

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    await mutate(() => apiFetch<CartSummary>(`/api/cart/items/${itemId}`, {
      method: 'PATCH', body: { quantity },
    }));
  }, [mutate]);

  const removeItem = useCallback(async (itemId: string) => {
    await mutate(() => apiFetch<CartSummary>(`/api/cart/items/${itemId}`, { method: 'DELETE' }));
  }, [mutate]);

  const applyCoupon = useCallback(async (code: string) => {
    await mutate(() => apiFetch<CartSummary>('/api/cart/coupon', { method: 'POST', body: { code } }));
  }, [mutate]);

  const removeCoupon = useCallback(async () => {
    await mutate(() => apiFetch<CartSummary>('/api/cart/coupon', { method: 'DELETE' }));
  }, [mutate]);

  const value = useMemo<CartContextValue>(() => ({
    cart, loading, mutating, error, isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    addItem, updateItem, removeItem, applyCoupon, removeCoupon, reload,
  }), [cart, loading, mutating, error, isOpen, addItem, updateItem, removeItem, applyCoupon, removeCoupon, reload]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}
