/**
 * Where the "Shop now" button drawn in each supplied banner sits, as a percentage of the
 * picture (found by colour-detecting the button, then checked by eye). The carousel lays a
 * real link over that spot so it works like a button: pointer, hover lift, keyboard focus.
 *
 * Every banner is cropped to ONE shape (1.9:1) so the carousel never changes height; the
 * supplied files were cropped to it by hand, so these boxes are measured on the cropped files.
 * Keyed by file name. A banner uploaded later has no entry; its whole picture is the link.
 * If an image is re-exported or re-cropped, re-measure its entry.
 */
export const BANNER_ASPECT = 1900 / 1000;

export const BANNER_BUTTONS: Record<string, { x: number; y: number; w: number; h: number }> = {
  'banner-1-floor.jpg': { x: 1.49, y: 65.09, w: 19.62, h: 8.49 },
  'banner-2-made-easy.jpg': { x: 5.76, y: 66.2, w: 26.35, h: 9.2 },
  'banner-3-on-the-go.jpg': { x: 4.36, y: 81.77, w: 24.42, h: 11.6 },
  'banner-4-pristine-care.jpg': { x: 3.78, y: 67.96, w: 19.19, h: 8.29 },
  'banner-5-precision.jpg': { x: 3.78, y: 70.17, w: 19.77, h: 7.73 },
  'banner-6-effortless.jpg': { x: 4.65, y: 81.77, w: 25.58, h: 10.5 },
  'banner-7-spa.jpg': { x: 5.52, y: 83.98, w: 19.19, h: 9.94 },
  'banner-8-cage.jpg': { x: 4.94, y: 82.87, w: 24.42, h: 12.71 },
};

export function bannerButton(src: string) {
  return BANNER_BUTTONS[src.split('/').pop() ?? ''] ?? null;
}
