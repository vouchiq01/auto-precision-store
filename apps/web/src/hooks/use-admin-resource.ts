'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

/**
 * Load-and-mutate for the admin tables.
 *
 * Every mutation refetches rather than patching local state. For an admin panel
 * this is the right trade: a stale row that disagrees with the database is far
 * more costly than one extra request on an action taken a few times an hour.
 */
export function useAdminResource<T>(path: string) {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await apiFetch<T>(path, { token }));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this.');
    } finally {
      setLoading(false);
    }
  }, [path, token]);

  useEffect(() => { void load(); }, [load]);

  const mutate = useCallback(async (
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    subpath: string,
    body?: unknown,
  ) => {
    if (!token) throw new Error('Not signed in');
    setBusy(true); setError(null);
    try {
      const result = await apiFetch(subpath, { method, body, token });
      await load();
      return result;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
      throw err;
    } finally {
      setBusy(false);
    }
  }, [token, load]);

  return { data, loading, error, busy, reload: load, mutate, setError };
}
