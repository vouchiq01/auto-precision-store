import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { addToCartSchema, applyCouponSchema, CART, updateCartItemSchema, uuidSchema } from '@aps/shared';
import { asyncHandler } from '../lib/async-handler.ts';
import { isProduction } from '../env.ts';
import { optionalAuth } from '../middleware/auth.ts';
import { params, validateBody, validateParams } from '../middleware/validate.ts';
import {
  addItem, clearCart, getCartSummary, getOrCreateCart, newSessionToken, removeItem, setCoupon, updateItem, claimGuestCart } from '../services/cart.service.ts';

export const CART_COOKIE = 'aps_cart';

/**
 * The same opaque guest-cart token, carried as a request/response HEADER.
 *
 * The cookie alone does not work on phones. The storefront (Vercel) and this API
 * (Render) are different sites, so `aps_cart` is a third-party cookie, and
 * Safari/iOS and several Android browsers block those. The result was a fresh,
 * empty guest cart on every request: add a second table and the first was gone,
 * apply a coupon and the cart emptied. Laptops that allow third-party cookies
 * never showed it.
 *
 * So the server returns the token in `x-cart-token` on every guest-cart response,
 * the browser keeps it in localStorage and sends it back, and the header wins over
 * the cookie when both are present. The cookie is still set for browsers that
 * accept it. The value `none` tells the client to forget its token (the cart was
 * handed to an account at sign-in).
 */
export const CART_HEADER = 'x-cart-token';

export function guestCartToken(req: Request): string | undefined {
  const header = req.get(CART_HEADER);
  if (header && header !== 'none' && header.length <= 128) return header;
  return ((req.cookies ?? {}) as Record<string, string>)[CART_COOKIE];
}

export const cartRouter: Router = Router();
cartRouter.use(optionalAuth);

/**
 * Resolve the caller's cart, creating one if needed.
 *
 * Guests are identified by an opaque cookie. Signed-in users are identified by
 * their id, and their cookie is ignored — the merge already happened at login.
 */
async function resolveCart(req: Request, res: Response) {
  const sessionToken = guestCartToken(req);

  /* Signing in must never cost someone their basket. getOrCreateCart keys on
     the user as soon as there is one and stops looking at the cookie, so the
     guest cart has to be handed over first — otherwise the shopper verifies at
     the pay step and lands on an empty cart. */
  if (req.user && sessionToken) {
    await claimGuestCart(req.user.id, sessionToken);
    res.clearCookie(CART_COOKIE, { path: '/' });
    res.setHeader(CART_HEADER, 'none');
  }

  const cart = await getOrCreateCart({
    userId: req.user?.id,
    sessionToken: req.user ? undefined : sessionToken,
  });

  if (!req.user && cart.sessionToken) res.setHeader(CART_HEADER, cart.sessionToken);

  if (!req.user && cart.sessionToken && cart.sessionToken !== sessionToken) {
    res.cookie(CART_COOKIE, cart.sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: CART.guestCartTtlDays * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  return cart;
}

cartRouter.get('/', asyncHandler(async (req, res) => {
  const cart = await resolveCart(req, res);
  res.json(await getCartSummary(cart.id, req.user?.id));
}));

cartRouter.post('/items', validateBody(addToCartSchema), asyncHandler(async (req, res) => {
  const cart = await resolveCart(req, res);
  const { variantId, quantity } = req.body as { variantId: string; quantity: number };
  await addItem(cart.id, variantId, quantity);
  res.status(201).json(await getCartSummary(cart.id, req.user?.id));
}));

cartRouter.patch('/items/:itemId',
  validateParams(z.object({ itemId: uuidSchema })),
  validateBody(updateCartItemSchema),
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res);
    const { itemId } = params<{ itemId: string }>(req);
    await updateItem(cart.id, itemId, (req.body as { quantity: number }).quantity);
    res.json(await getCartSummary(cart.id, req.user?.id));
  }),
);

cartRouter.delete('/items/:itemId',
  validateParams(z.object({ itemId: uuidSchema })),
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res);
    await removeItem(cart.id, params<{ itemId: string }>(req).itemId);
    res.json(await getCartSummary(cart.id, req.user?.id));
  }),
);

cartRouter.post('/coupon', validateBody(applyCouponSchema), asyncHandler(async (req, res) => {
  const cart = await resolveCart(req, res);
  await setCoupon(cart.id, (req.body as { code: string }).code);
  /* The summary reports whether the code actually applies and why not, rather
     than this route deciding — one place owns that explanation. */
  res.json(await getCartSummary(cart.id, req.user?.id));
}));

cartRouter.delete('/coupon', asyncHandler(async (req, res) => {
  const cart = await resolveCart(req, res);
  await setCoupon(cart.id, null);
  res.json(await getCartSummary(cart.id, req.user?.id));
}));

cartRouter.delete('/', asyncHandler(async (req, res) => {
  const cart = await resolveCart(req, res);
  await clearCart(cart.id);
  res.json(await getCartSummary(cart.id, req.user?.id));
}));

export { resolveCart, newSessionToken };
