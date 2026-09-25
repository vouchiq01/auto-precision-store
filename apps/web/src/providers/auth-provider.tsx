'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AuthUser } from '@aps/shared';
import { apiFetch, ApiError } from '@/lib/api';

/**
 * Session state.
 *
 * The access token is held in memory ONLY — never localStorage, which any
 * injected script can read. It is refreshed from the httpOnly cookie on mount
 * and again shortly before expiry, so a reload feels like staying signed in
 * without the token ever being persisted where script can reach it.
 */

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  /** True until the first refresh attempt settles, so UI can avoid flashing "sign in". */
  loading: boolean;
  isAdmin: boolean;
  requestOtp: (phone: string) => Promise<{ devCode?: string }>;
  verifyOtp: (phone: string, code: string, fullName?: string) => Promise<AuthUser>;
  adminLogin: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface SessionResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((expiresIn: number) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    /* Refresh a minute early. Waiting for the token to actually expire means
       the next request fails first, and the user sees a flicker of signed-out. */
    const delay = Math.max(30_000, (expiresIn - 60) * 1000);
    refreshTimer.current = setTimeout(() => { void refresh(); }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySession = useCallback((session: SessionResponse) => {
    setUser(session.user);
    setToken(session.accessToken);
    scheduleRefresh(session.expiresIn);
  }, [scheduleRefresh]);

  const refresh = useCallback(async () => {
    try {
      const session = await apiFetch<SessionResponse>('/api/auth/refresh', { method: 'POST' });
      applySession(session);
    } catch {
      // No valid refresh cookie. That is the normal state for a first-time
      // visitor, so it is not an error worth surfacing.
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    void refresh();
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, [refresh]);

  const requestOtp = useCallback(async (phone: string) => {
    const result = await apiFetch<{ sent: boolean; devCode?: string }>('/api/auth/otp/request', {
      method: 'POST', body: { phone },
    });
    return { devCode: result.devCode };
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string, fullName?: string) => {
    const session = await apiFetch<SessionResponse>('/api/auth/otp/verify', {
      method: 'POST', body: { phone, code, ...(fullName ? { fullName } : {}) },
    });
    applySession(session);
    return session.user;
  }, [applySession]);

  const adminLogin = useCallback(async (email: string, password: string) => {
    const session = await apiFetch<SessionResponse>('/api/auth/admin/login', {
      method: 'POST', body: { email, password },
    });
    applySession(session);
    return session.user;
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Signing out must always succeed locally, even if the server call fails.
      if (!(error instanceof ApiError)) throw error;
    }
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, token, loading,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    requestOtp, verifyOtp, adminLogin, logout, refresh,
  }), [user, token, loading, requestOtp, verifyOtp, adminLogin, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
