import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The four tags a product can wear on its card and page. Each has its own colour AND its own
 * icon, so they read differently at a glance (and not by colour alone). They are merchandising
 * labels the owner sets per product in Admin → Products → "Card tag"; the first badge of a
 * product that matches one of these is the one shown on its card.
 */
export type TagKey = 'hot' | 'best-seller' | 'new' | 'trending';

export const TAG_OPTIONS: { key: TagKey; label: string }[] = [
  { key: 'hot', label: 'Hot' },
  { key: 'best-seller', label: 'Best Seller' },
  { key: 'new', label: 'New' },
  { key: 'trending', label: 'Trending' },
];

const norm = (text: string) => text.toLowerCase().replace(/[^a-z]/g, '');
const BY_NAME: Record<string, TagKey> = { hot: 'hot', bestseller: 'best-seller', new: 'new', trending: 'trending' };

/** The tag this badge text means, if it is one of the four. */
export function tagFor(badge: string): TagKey | null {
  return BY_NAME[norm(badge)] ?? null;
}

/** The first of a product's badges that is one of the four tags. */
export function pickCardTag(badges: string[] | undefined): TagKey | null {
  for (const badge of badges ?? []) {
    const key = tagFor(badge);
    if (key) return key;
  }
  return null;
}

const STYLES: Record<TagKey, { label: string; className: string; icon: ReactNode }> = {
  hot: {
    label: 'Hot',
    className: 'bg-gradient-to-r from-[#F2570C] to-[#D91F26] text-white shadow-[0_4px_12px_-4px_rgba(217,31,38,0.65)]',
    icon: <path d="M12 2.5c.4 3-1.2 4.6-2.6 6.2C8 10.3 7 11.8 7 13.9a5 5 0 0 0 10 0c0-1.8-.8-3.1-1.7-4.2-.3 1.2-1 2-1.9 2.3.6-3-.2-6.500-1.400-9.500z" fill="currentColor" stroke="none" />,
  },
  'best-seller': {
    label: 'Best Seller',
    className: 'bg-gradient-to-r from-[#FFC93C] to-[#F59E0B] text-[#3B2600] shadow-[0_4px_12px_-4px_rgba(245,158,11,0.7)]',
    icon: <path d="M12 3l2.600 5.400 5.900.8-4.300 4.100 1 5.800L12 16.400l-5.200 2.700 1-5.800L3.500 9.200l5.900-.8z" fill="currentColor" stroke="none" />,
  },
  new: {
    label: 'New',
    className: 'bg-[#0B7A4B] text-white ring-1 ring-white/70',
    icon: <path d="M12 3l1.600 5.400L19 10l-5.400 1.600L12 17l-1.600-5.400L5 10l5.400-1.600zM19 15l.7 2.300L22 18l-2.300.7L19 21l-.7-2.300L16 18l2.300-.7z" fill="currentColor" stroke="none" />,
  },
  trending: {
    label: 'Trending',
    className: 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-[0_4px_12px_-4px_rgba(79,70,229,0.65)]',
    icon: <path d="M3 17l6-6 4 4 7-8M15 7h5v5" fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round" strokeLinejoin="round" />,
  },
};

export function ProductTag({ tag, className }: { tag: TagKey; className?: string }) {
  const style = STYLES[tag];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full py-1 pl-1.5 pr-2.5 text-[0.6875rem] font-bold uppercase leading-none tracking-[0.06em]',
        style.className,
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" aria-hidden="true">{style.icon}</svg>
      {style.label}
    </span>
  );
}
