'use client';

import { useEffect, useRef, type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  direction?: Direction;
  delay?: number;
  duration?: number;
  distance?: number;
  /** Stagger children instead of moving the wrapper as one block. */
  stagger?: number;
  once?: boolean;
}

const OFFSETS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 1 }, down: { x: 0, y: -1 },
  left: { x: 1, y: 0 }, right: { x: -1, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * Scroll-triggered entrance.
 *
 * Only `opacity` and `transform` are animated, so the whole thing stays on the
 * compositor and never triggers layout. Under reduced motion the element simply
 * renders in place — no delay, no transition, nothing to wait for.
 */
export function Reveal({
  children, className, as: Tag = 'div',
  direction = 'up', delay = 0, duration = 0.9, distance = 28,
  stagger, once = true,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (reduced) {
      element.style.opacity = '1';
      element.style.transform = 'none';
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'), import('gsap/ScrollTrigger'),
      ]);
      if (cancelled || !ref.current) return;
      gsap.registerPlugin(ScrollTrigger);

      const offset = OFFSETS[direction];
      const targets = stagger ? Array.from(element.children) : element;

      const tween = gsap.fromTo(targets,
        { opacity: 0, x: offset.x * distance, y: offset.y * distance },
        {
          opacity: 1, x: 0, y: 0,
          duration, delay,
          ease: 'expo.out',
          ...(stagger ? { stagger } : {}),
          scrollTrigger: {
            trigger: element,
            // Fire a little before the element is fully on screen, so it has
            // finished arriving by the time the reader's eye gets there.
            start: 'top 88%',
            toggleActions: once ? 'play none none none' : 'play none none reverse',
          },
        },
      );

      cleanup = () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    })();

    return () => { cancelled = true; cleanup?.(); };
  }, [reduced, direction, delay, duration, distance, stagger, once]);

  return (
    <Tag ref={ref} data-reveal className={className}>
      {children}
    </Tag>
  );
}

/**
 * Splits a headline into words and floats them up in sequence.
 * Words, not characters: per-character animation on a long heading is both
 * slower and, for a screen reader, an accessibility hazard if it splits text
 * nodes. Here the original string stays intact for assistive tech.
 */
export function RevealText({
  text, className, delay = 0, as: Tag = 'span',
}: { text: string; className?: string; delay?: number; as?: ElementType }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const words = text.split(' ');

  useEffect(() => {
    const element = ref.current;
    if (!element || reduced) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'), import('gsap/ScrollTrigger'),
      ]);
      if (cancelled || !ref.current) return;
      gsap.registerPlugin(ScrollTrigger);

      const tween = gsap.fromTo(
        element.querySelectorAll('[data-word] > span'),
        { yPercent: 115 },
        {
          yPercent: 0, duration: 1.1, delay, ease: 'expo.out', stagger: 0.045,
          scrollTrigger: { trigger: element, start: 'top 90%', toggleActions: 'play none none none' },
        },
      );
      cleanup = () => { tween.scrollTrigger?.kill(); tween.kill(); };
    })();

    return () => { cancelled = true; cleanup?.(); };
  }, [reduced, delay]);

  return (
    <Tag ref={ref} className={cn('inline', className)}>
      {/* The accessible string, read as one continuous phrase. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <span key={`${word}-${i}`} data-word className="inline-block overflow-hidden align-bottom">
            <span className="inline-block will-change-transform">
              {word}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          </span>
        ))}
      </span>
    </Tag>
  );
}
