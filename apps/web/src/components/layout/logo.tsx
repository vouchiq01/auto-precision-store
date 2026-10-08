import Image from 'next/image';
import { cn } from '@/lib/cn';

/**
 * The Auto Precision logo, as supplied by the client: a red "ap" mark hanging
 * from a bar, "Auto" in red and "Precision" in black.
 *
 * It is designed for a LIGHT background — the black "Precision" disappears on
 * navy — which is why the header is white. On a dark surface (the footer) use
 * `variant="white"`, a one-colour version cut from the same artwork. Do not
 * redraw the mark in code or recolour the full-colour file: use these files.
 *
 * `public/brand/logo.png` is the transparent full-colour artwork;
 * `logo-white.png` is the same shape in solid white. The favicon
 * (`app/icon.png`) is the "ap" mark alone.
 */
export function Logo({
  className,
  variant = 'colour',
  priority = false,
}: {
  /** Sets the height; the width follows the artwork's 5.3:1 ratio. */
  className?: string;
  variant?: 'colour' | 'white';
  priority?: boolean;
}) {
  return (
    <Image
      src={variant === 'white' ? '/brand/logo-white.png' : '/brand/logo.png'}
      alt="Auto Precision"
      width={1200}
      height={225}
      priority={priority}
      className={cn('h-8 w-auto', className)}
    />
  );
}
