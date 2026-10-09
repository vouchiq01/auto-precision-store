/**
 * "Fly to cart": the confirmation for adding something to the cart.
 *
 * Adding used to slide the whole cart drawer open over the page, which hid the
 * thing the shopper was browsing and made buying two tables mean closing a panel
 * in between. Now the product's photograph lifts off the card, flies to the Cart
 * button in the header and shrinks into it, the button gives a small bounce, and
 * the count updates. The drawer still opens when Cart is tapped.
 *
 * Plain DOM + the Web Animations API on purpose: it is a one-shot visual effect
 * that must not re-render React, and it has to work from any component that adds
 * to the cart without threading refs through the tree. Client-only — call it from
 * event handlers.
 *
 * The target is the element marked `data-cart-target` (the header's Cart button,
 * which is visible at every screen size). Under `prefers-reduced-motion` nothing
 * moves; the button's own "Added ✓" state is the confirmation.
 */

const GHOST_MS = 800;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The element's rect, but only when a useful part of it is on screen. */
function onScreenRect(element: Element | null | undefined): DOMRect | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return null;
  const visible = rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
  return visible ? rect : null;
}

function bounce(target: HTMLElement) {
  target.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.14)', offset: 0.4 }, { transform: 'scale(1)' }],
    { duration: 420, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  );
}

/**
 * Fly a copy of `preferred` (usually the product photo) to the cart button.
 * If `preferred` is not on screen — the sticky bar adding while the gallery has
 * scrolled away — it flies from `fallback` (the button that was pressed) instead.
 */
export function flyToCart(preferred: Element | null | undefined, fallback?: Element | null): void {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;

  const target = document.querySelector<HTMLElement>('[data-cart-target]');
  if (!target) return;

  const source = onScreenRect(preferred) ? preferred! : onScreenRect(fallback) ? fallback! : null;
  const from = source ? source.getBoundingClientRect() : null;
  if (!source || !from) { bounce(target); return; }

  /* The gallery marks the picture currently showing; otherwise the first image in the source. */
  const photo = (source.querySelector('img[data-fly-active]') ?? source.querySelector('img')) as HTMLImageElement | null;
  const ghost = document.createElement('div');
  Object.assign(ghost.style, {
    position: 'fixed', left: `${from.left}px`, top: `${from.top}px`,
    width: `${from.width}px`, height: `${from.height}px`,
    zIndex: '90', pointerEvents: 'none', overflow: 'hidden',
    borderRadius: '16px', background: photo ? '#fff' : '#C8202B',
    boxShadow: '0 18px 40px -12px rgba(0,0,0,0.35)', willChange: 'transform, opacity',
  } satisfies Partial<CSSStyleDeclaration>);

  if (photo) {
    const copy = document.createElement('img');
    copy.src = photo.currentSrc || photo.src;
    copy.alt = '';
    Object.assign(copy.style, { width: '100%', height: '100%', objectFit: 'contain', padding: '8px', boxSizing: 'border-box' });
    ghost.appendChild(copy);
  }
  document.body.appendChild(ghost);

  const to = target.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const end = Math.min(0.22, 34 / Math.max(from.width, from.height));

  const animation = ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      // The mid point leans towards the target's x first, so the path curves
      // rather than running dead straight.
      { transform: `translate(${dx * 0.62}px, ${dy * 0.3}px) scale(${(1 + end) / 2.2})`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${end})`, opacity: 0.55, borderRadius: '50%' },
    ],
    { duration: GHOST_MS, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards' },
  );
  animation.onfinish = () => { ghost.remove(); bounce(target); };
  animation.oncancel = () => ghost.remove();
}

/**
 * A short message near the bottom of the screen, for when an add did not work
 * (out of stock, network). Success needs no message — the photograph flying to
 * the cart is the message.
 */
export function showCartMessage(text: string): void {
  if (typeof document === 'undefined') return;
  document.querySelector('[data-cart-message]')?.remove();

  const note = document.createElement('div');
  note.setAttribute('data-cart-message', '');
  note.setAttribute('role', 'status');
  note.textContent = text;
  Object.assign(note.style, {
    position: 'fixed', left: '50%', bottom: '5.5rem', transform: 'translateX(-50%)',
    maxWidth: 'min(92vw, 28rem)', padding: '0.75rem 1.1rem', borderRadius: '999px',
    background: '#0D1322', color: '#fff', fontSize: '0.8125rem', lineHeight: '1.3',
    boxShadow: '0 12px 30px -10px rgba(0,0,0,0.45)', zIndex: '95', textAlign: 'center',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(note);

  const fade = note.animate([{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 3600 });
  fade.onfinish = () => note.remove();
}

/** A readable reason from whatever an add threw. */
export function addErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Could not add that to your cart. Please try again.';
}
