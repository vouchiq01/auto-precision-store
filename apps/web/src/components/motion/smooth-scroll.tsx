'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/**
 * Lenis smooth scrolling, wired to GSAP's ScrollTrigger.
 *
 * Both libraries want to own the scroll position. Lenis is made the single
 * source of truth and ScrollTrigger is driven from its callback, which is what
 * stops pinned sections from drifting a few pixels out of sync on every frame.
 *
 * Disabled entirely under reduced motion — hijacking someone's scroll wheel is
 * exactly what that preference exists to prevent.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const pathname = usePathname();

  useEffect(() => {
    if (reduced) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({
        duration: 1.05,
        easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
        smoothWheel: true,
        // Touch devices already scroll smoothly and natively; intercepting that
        // only makes the page feel laggy on a phone.
        syncTouch: false,
      });

      lenis.on('scroll', ScrollTrigger.update);

      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      document.documentElement.classList.add('lenis');

      cleanup = () => {
        gsap.ticker.remove(raf);
        lenis.destroy();
        document.documentElement.classList.remove('lenis');
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [reduced]);

  // Route changes must land at the top, and any pinned trigger from the old
  // page must be recalculated against the new one.
  useEffect(() => {
    window.scrollTo(0, 0);
    void import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => ScrollTrigger.refresh());
  }, [pathname]);

  return <>{children}</>;
}
