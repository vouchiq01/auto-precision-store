'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * A strip of jump links (Details · Specifications · FAQs · Reviews) that sticks under the site
 * header while the long page scrolls, and lights the section being read. Only the sections that
 * exist on this page are passed in.
 */
export function SectionTabs({ tabs }: { tabs: { id: string; label: string }[] }) {
  const [current, setCurrent] = useState(tabs[0]?.id ?? '');

  useEffect(() => {
    const targets = tabs.map((t) => document.getElementById(t.id)).filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;
    const onScroll = () => {
      /* The last section whose top has passed a line a little below the sticky bars. */
      const line = window.innerHeight * 0.3;
      let found = targets[0]!.id;
      for (const el of targets) if (el.getBoundingClientRect().top <= line) found = el.id;
      setCurrent(found);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [tabs]);

  if (tabs.length < 2) return null;

  return (
    <nav
      aria-label="On this page"
      /* Under the fixed header: 64px on a phone, 108px on a desktop (two rows). */
      className="sticky top-16 z-30 mt-10 border-y border-line bg-canvas/95 backdrop-blur-md lg:top-[6.75rem]"
    >
      <div className="shell flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            aria-current={current === tab.id ? 'true' : undefined}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[0.8125rem] font-medium transition-colors',
              current === tab.id ? 'bg-ink text-on-ink' : 'text-muted hover:bg-sand hover:text-content',
            )}
          >
            {tab.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
