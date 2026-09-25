'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks prefers-reduced-motion, and keeps tracking it — people change this
 * setting mid-session, often precisely because a site made them feel unwell.
 *
 * Starts `true` so the very first render is the still version: it is far better
 * to skip an animation that was wanted than to fire one that was not.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/** True once mounted on the client. Guards anything that must not run during SSR. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
