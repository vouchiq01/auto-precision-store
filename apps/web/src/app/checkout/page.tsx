'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { formatINR, INDIAN_STATES, STORE, type CheckoutQuote } from '@aps/shared';
import { apiFetch, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/auth-provider';
import { useSignIn } from '@/providers/sign-in-provider';
import { useCart } from '@/providers/cart-provider';
import { useRazorpay } from '@/hooks/use-razorpay';
import { ListingHero } from '@/components/collection/listing-hero';
import { Button, ButtonLink } from '@/components/ui/button';
import { Spinner } from '@/components/ui/primitives';

interface AddressForm {
  fullName: string; phone: string; line1: string; line2: string; landmark: string;
  city: string; state: string; pincode: string;
}

const EMPTY_ADDRESS: AddressForm = {
  fullName: '', phone: '', line1: '', line2: '', landmark: '',
  city: '', state: 'Karnataka', pincode: '',
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, token, requestOtp, verifyOtp } = useAuth();
  const { openSignIn } = useSignIn();
  const { cart, loading, reload } = useCart();
  const razorpay = useRazorpay();

  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS);
  const [gstin, setGstin] = useState('');
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [notes, setNotes] = useState('');

  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Kept apart from the quote's error on purpose. refreshQuote clears `error`
     every time it runs, and it runs whenever the cart or address changes — so
     a failure to place the order was being wiped a few milliseconds after it
     appeared, leaving a checkout that silently did nothing. */
  const [orderError, setOrderError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  /* Identity is confirmed at the very end, not at the door.
     A ₹1,12,400 crate goes out against this phone number: if it has a typo the
     courier cannot reach anyone and the table comes back at our cost, and the
     12–36 month warranty has no verified customer behind it. But making people
     register BEFORE they can even see freight is the single biggest cause of
     abandoned carts, so the ask lands after they have decided to buy and is
     framed as confirming a number they already typed — not as signing up. */
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (!user) return;
    setAddress((prev) => ({
      ...prev,
      fullName: prev.fullName || user.fullName || '',
      phone: prev.phone || (user.phone?.replace('+91', '') ?? ''),
    }));

    /* A returning customer should not retype an address we already hold. Only
       fills blanks, so anything they have already typed this visit wins. */
    let cancelled = false;
    void (async () => {
      try {
        const saved = await apiFetch<{ items: Array<AddressForm & { isDefault: boolean }> }>('/api/account/addresses', { token });
        const preferred = saved.items.find((a) => a.isDefault) ?? saved.items[0];
        if (!preferred || cancelled) return;
        setAddress((prev) => ({
          fullName: prev.fullName || preferred.fullName || '',
          phone: prev.phone || (preferred.phone?.replace('+91', '') ?? ''),
          line1: prev.line1 || preferred.line1 || '',
          line2: prev.line2 || preferred.line2 || '',
          landmark: prev.landmark || preferred.landmark || '',
          city: prev.city || preferred.city || '',
          state: prev.state === 'Karnataka' ? (preferred.state || prev.state) : prev.state,
          pincode: prev.pincode || preferred.pincode || '',
        }));
      } catch {
        // No saved address, or the session lapsed. Neither is worth surfacing.
      }
    })();
    return () => { cancelled = true; };
  }, [user, token]);

  const canQuote = address.pincode.length === 6 && address.state && (cart?.itemCount ?? 0) > 0;

  /* Re-price whenever the address or GSTIN changes: freight is weight × zone and
     the tax split depends on the delivery state, so a Karnataka address and a
     Delhi one genuinely produce different totals. */
  const fetchQuote = useCallback(async (tokenOverride?: string) => apiFetch<CheckoutQuote>('/api/checkout/quote', {
    token: tokenOverride ?? token,
    method: 'POST',
    body: {
      shippingAddress: { ...address, line2: address.line2 || null, landmark: address.landmark || null, type: 'home', isDefault: false },
      couponCode: cart?.couponCode ?? null,
      gstin: wantsInvoice && gstin ? gstin : null,
    },
  }), [address, cart?.couponCode, gstin, wantsInvoice, token]);

  const refreshQuote = useCallback(async () => {
    if (!canQuote) { setQuote(null); return; }
    setQuoting(true); setError(null);
    try {
      setQuote(await fetchQuote());
    } catch (err) {
      setQuote(null);
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.errors ?? {});
      }
    } finally {
      setQuoting(false);
    }
  }, [canQuote, fetchQuote]);

  useEffect(() => {
    const timer = setTimeout(() => { void refreshQuote(); }, 400);
    return () => clearTimeout(timer);
  }, [refreshQuote]);

  async function placeOrder(event: React.FormEvent) {
    event.preventDefault();
    /* Guests confirm the number they just typed before paying; the account is
       created from that verification rather than from a separate signup. */
    if (!user) { await startVerification(); return; }
    await submitOrder();
  }

  async function startVerification() {
    setOtpBusy(true); setOrderError(null); setOtpError(null);
    try {
      const { devCode: code } = await requestOtp(address.phone);
      setDevCode(code ?? null);
      setOtpStep(true);
      setResendIn(30);
    } catch (err) {
      setOrderError(err instanceof ApiError
        ? (err.fieldError('phone') ?? err.message)
        : 'Could not send the code. Check the mobile number.');
    } finally {
      setOtpBusy(false);
    }
  }

  async function confirmCode() {
    setOtpBusy(true); setOtpError(null);
    try {
      const session = await verifyOtp(address.phone, otpCode, address.fullName.trim() || undefined);
      setOtpStep(false); setOtpCode('');

      /* Signing in can change what is in the basket: an abandoned cart on this
         account gets merged with the one they just built as a guest. That is
         the right thing to do with their items, but it means the total can
         move between the figure on the button and the order we are about to
         place — shop on a phone, finish on a laptop, and you would be charged
         a number you were never shown. Re-price first and stop if it moved. */
      const shownTotal = quote?.grandTotal ?? null;
      const repriced = await fetchQuote(session.accessToken);
      setQuote(repriced);
      await reload();

      if (shownTotal !== null && repriced.grandTotal !== shownTotal) {
        setOrderError(
          `You had items saved from an earlier visit, so they have been added to this order. `
          + `The total is now ${formatINR(repriced.grandTotal)} — check the summary and pay again.`,
        );
        return;
      }
      /* Straight on to payment — making them press Pay a second time after
         verifying is a step that buys nothing.

         The token is passed explicitly rather than read from state: this
         function closed over `token` during a render that happened BEFORE
         sign-in, and execution resumes here on a microtask, long before React
         has committed the new value. Relying on the closure sends the order up
         unauthenticated, and the 401 is then wiped by the quote refresh that
         the merged cart triggers — a completely silent failure. */
      await submitOrder(session.accessToken);
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : 'That code did not work.');
    } finally {
      setOtpBusy(false);
    }
  }

  async function submitOrder(freshToken?: string) {
    setPlacing(true); setOrderError(null); setFieldErrors({});

    try {
      const order = await apiFetch<{
        orderId: string; orderNumber: string; grandTotal: number;
        razorpayOrderId: string | null; razorpayKeyId: string | null;
      }>('/api/checkout/orders', {
        method: 'POST',
        token: freshToken ?? token,
        body: {
          shippingAddress: { ...address, line2: address.line2 || null, landmark: address.landmark || null, type: 'home', isDefault: false },
          billingSameAsShipping: true,
          couponCode: cart?.couponCode ?? null,
          gstin: wantsInvoice && gstin ? gstin : null,
          notes: notes || null,
        },
      });

      /* If the gateway handshake failed server-side, the order still exists and
         stock is held — send the customer to the order page to retry payment
         rather than losing the order entirely. */
      if (!order.razorpayOrderId || !order.razorpayKeyId) {
        await reload();
        router.push(`/order/${order.orderNumber}?payment=unavailable`);
        return;
      }

      if (!razorpay.ready) {
        setOrderError('The payment window is still loading. Please try again in a moment.');
        setPlacing(false);
        return;
      }

      razorpay.open({
        key: order.razorpayKeyId,
        amount: order.grandTotal,
        currency: 'INR',
        name: STORE.name,
        description: `Order ${order.orderNumber}`,
        order_id: order.razorpayOrderId,
        prefill: { name: address.fullName, contact: address.phone, email: user?.email ?? undefined },
        theme: { color: '#C8202B' },
        handler: (response) => {
          void (async () => {
            try {
              await apiFetch(`/api/checkout/orders/${order.orderId}/confirm`, {
                method: 'POST',
                token: freshToken ?? token,
                body: {
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                },
              });
            } catch {
              /* The webhook is the source of truth and will confirm this order
                 regardless, so a failed client callback must not show an error
                 to someone whose money has already left. */
            }
            await reload();
            router.push(`/order/${order.orderNumber}`);
          })();
        },
        modal: {
          ondismiss: () => {
            setPlacing(false);
            setOrderError('Payment was cancelled. Your order is saved — you can pay for it from your account.');
          },
        },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setOrderError(err.message);
        setFieldErrors(err.errors ?? {});
      } else {
        setOrderError('Something went wrong. Please try again.');
      }
      setPlacing(false);
    }
  }

  if (loading) {
    return <div className="shell grid min-h-[60vh] place-items-center pt-28"><Spinner className="text-muted" /></div>;
  }

  if (!cart || cart.itemCount === 0) {
    return (
      <>
        <ListingHero crumb="Checkout" title="Checkout" />
        <div className="shell py-12 md:py-20">
          <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface px-6 py-12 text-center shadow-card">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-content">Your cart is empty</h2>
            <p className="mt-2 text-sm text-muted">Add a table before checking out.</p>
            <ButtonLink href="/shop" size="lg" className="mt-6">Shop all tables</ButtonLink>
          </div>
        </div>
      </>
    );
  }

  const inputBase = 'h-12 w-full rounded-xl border bg-surface px-4 text-base text-content outline-none transition-colors placeholder:text-faint focus:ring-2 focus:ring-crimson/15';

  const field = (
    name: keyof AddressForm,
    label: string,
    props: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {},
    prefix?: string,
  ) => {
    const errors = fieldErrors[`shippingAddress.${name}`];
    return (
      <label className="block">
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-content">{label}</span>
        <span className="relative block">
          {prefix && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted">{prefix}</span>
          )}
          <input
            value={address[name]}
            onChange={(e) => setAddress((prev) => ({ ...prev, [name]: e.target.value }))}
            className={cn(inputBase, prefix && 'pl-12', errors ? 'border-crimson' : 'border-line focus:border-ink')}
            {...props}
          />
        </span>
        {errors && <span className="mt-1 block text-xs text-crimson">{errors[0]}</span>}
      </label>
    );
  };

  const total = quote ? quote.grandTotal : cart.estimatedTotal;

  const itemRows = cart.lines.map((line) => (
    <li key={line.id} className="flex items-center gap-3">
      <span className="relative size-14 shrink-0 rounded-xl bg-sand">
        <span className="absolute inset-0 overflow-hidden rounded-xl border border-line bg-white">
          {line.product.image && (
            <Image src={line.product.image.url} alt="" fill sizes="56px" className="object-contain p-1" />
          )}
        </span>
        <span className="numeric absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink text-[0.6875rem] font-medium text-on-ink">
          {line.quantity}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-medium leading-snug text-content">{line.product.name}</span>
        <span className="block text-xs text-muted">{line.variant.optionValue}</span>
      </span>
      <span className="numeric shrink-0 text-sm font-medium text-content">{formatINR(line.lineTotal)}</span>
    </li>
  ));

  return (
    <>
      <ListingHero
        crumb="Checkout"
        title="Checkout"
        description={
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm" aria-label="Checkout progress">
            <li className="flex items-center gap-2 text-muted">
              <span className="grid size-6 place-items-center rounded-full bg-success/15 text-xs text-success" aria-hidden="true">✓</span>
              <Link href="/cart" className="underline-offset-4 hover:text-content hover:underline">Cart</Link>
            </li>
            <span className="h-px w-5 bg-line-strong" aria-hidden="true" />
            <li className="flex items-center gap-2 font-medium text-content" aria-current="step">
              <span className="grid size-6 place-items-center rounded-full bg-crimson text-xs font-semibold text-white" aria-hidden="true">2</span>
              Delivery details
            </li>
            <span className="h-px w-5 bg-line-strong" aria-hidden="true" />
            <li className="flex items-center gap-2 text-faint">
              <span className="grid size-6 place-items-center rounded-full border border-line-strong text-xs" aria-hidden="true">3</span>
              Pay
            </li>
          </ol>
        }
      />

      <form onSubmit={placeOrder} className="shell grid gap-4 pb-14 pt-5 md:pt-8 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-8">
        {/* Phones: the basket folded away at the top, so people can check what
            they are buying without scrolling past the whole form to find it. */}
        <details className="group rounded-2xl border border-line bg-surface shadow-card lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 text-sm font-medium text-content">
              Order summary
              <span className="text-xs font-normal text-muted">({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'})</span>
              <svg viewBox="0 0 20 20" className="size-4 text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="numeric text-base font-semibold text-content">{formatINR(total)}</span>
          </summary>
          <ul className="space-y-3 border-t border-line p-4">{itemRows}</ul>
        </details>

        <div className="space-y-4">
          <Section n={1} title="Delivery details" description="Where the crate is going, and who the courier should call.">
            <fieldset className="space-y-4">
              <legend className="sr-only">Delivery address</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {field('fullName', 'Recipient name', { required: true, autoComplete: 'name', placeholder: 'Priya Raghavan' })}
                {field('phone', 'Mobile number', { required: true, inputMode: 'numeric', autoComplete: 'tel-national', placeholder: '98765 43210' }, '+91')}
              </div>
              {field('line1', 'Address', { required: true, autoComplete: 'address-line1', placeholder: '14, 3rd Cross, Indiranagar' })}
              <div className="grid gap-4 sm:grid-cols-2">
                {field('line2', 'Apartment, floor (optional)', { autoComplete: 'address-line2' })}
                {field('landmark', 'Landmark (optional)')}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {field('city', 'City', { required: true, autoComplete: 'address-level2', placeholder: 'Bengaluru' })}
                <label className="block">
                  <span className="mb-1.5 block text-[0.8125rem] font-medium text-content">State</span>
                  <select
                    value={address.state}
                    onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
                    className={cn(inputBase, 'cursor-pointer border-line focus:border-ink')}
                  >
                    {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                  </select>
                </label>
                {field('pincode', 'Pincode', { required: true, inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code', placeholder: '560001' })}
              </div>
            </fieldset>
          </Section>

          <Section n={2} title="GST invoice" optional>
            <fieldset className="space-y-4">
              <legend className="sr-only">GST invoice</legend>
              <label className="flex cursor-pointer items-start gap-3">
                <span className="relative mt-0.5 inline-flex shrink-0">
                  <input
                    type="checkbox"
                    checked={wantsInvoice}
                    onChange={(e) => setWantsInvoice(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="h-6 w-11 rounded-full bg-line-strong transition-colors peer-checked:bg-crimson peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-crimson" aria-hidden="true" />
                  <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-card transition-transform peer-checked:translate-x-5" aria-hidden="true" />
                </span>
                <span className="text-sm text-content">
                  I am buying for a business and need a GST invoice
                  <span className="mt-0.5 block text-xs text-muted">Lets you claim input credit on the GST portion.</span>
                </span>
              </label>

              {wantsInvoice && (
                <label className="block">
                  <span className="mb-1.5 block text-[0.8125rem] font-medium text-content">GSTIN</span>
                  <input
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    maxLength={15}
                    placeholder="29AAACR5055K1Z3"
                    className={cn(
                      inputBase, 'numeric uppercase tracking-wide',
                      fieldErrors.gstin ? 'border-crimson' : 'border-line focus:border-ink',
                    )}
                  />
                  {fieldErrors.gstin && <span className="mt-1 block text-xs text-crimson">{fieldErrors.gstin[0]}</span>}
                </label>
              )}
            </fieldset>
          </Section>

          <Section n={3} title="Delivery notes" optional>
            <label className="block">
              <span className="sr-only">Delivery notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Gate code, best time to deliver, anything the courier should know."
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-content outline-none transition-colors placeholder:text-faint focus:border-ink focus:ring-2 focus:ring-crimson/15"
              />
            </label>
          </Section>
        </div>

        {/* Live totals */}
        <aside className="lg:sticky lg:top-32 lg:h-fit">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-card md:p-6">
            <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-content">Order summary</h2>

            <ul className="mt-4 hidden space-y-3 border-b border-line pb-4 lg:block">{itemRows}</ul>

            <dl className={cn('mt-4 space-y-2.5 text-sm transition-opacity lg:mt-4', quoting && 'opacity-50')}>
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="numeric text-content">{formatINR(quote?.subtotal ?? cart.subtotal)}</dd>
              </div>

              {(quote?.discountTotal ?? cart.discountTotal) > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Discount {quote?.couponCode && `(${quote.couponCode})`}</dt>
                  <dd className="numeric">− {formatINR(quote?.discountTotal ?? cart.discountTotal)}</dd>
                </div>
              )}

              <div className="flex justify-between">
                <dt className="text-muted">
                  Freight
                  {quote?.shippingEta && <span className="block text-xs text-faint">{quote.shippingEta}</span>}
                </dt>
                <dd className={cn('numeric', quote?.shippingIsFree ? 'font-medium text-success' : 'text-content')}>
                  {quote ? (quote.shippingIsFree ? 'Free' : formatINR(quote.shippingTotal)) : '—'}
                </dd>
              </div>

              {quote && (
                <>
                  <div className="flex justify-between text-xs text-faint">
                    <dt>Taxable value</dt>
                    <dd className="numeric">{formatINR(quote.taxableValue)}</dd>
                  </div>
                  {quote.intraState ? (
                    <>
                      <div className="flex justify-between text-xs text-faint">
                        <dt>CGST</dt><dd className="numeric">{formatINR(quote.cgst)}</dd>
                      </div>
                      <div className="flex justify-between text-xs text-faint">
                        <dt>SGST</dt><dd className="numeric">{formatINR(quote.sgst)}</dd>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-xs text-faint">
                      <dt>IGST</dt><dd className="numeric">{formatINR(quote.igst)}</dd>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-baseline justify-between border-t border-line pt-3 text-lg">
                <dt className="font-medium text-content">Total</dt>
                <dd className="numeric font-semibold text-content">{formatINR(total)}</dd>
              </div>
            </dl>

            {!quote && canQuote && quoting && (
              <p className="mt-3 text-xs text-faint">Calculating freight…</p>
            )}
            {!canQuote && (
              <p className="mt-3 rounded-lg bg-sand px-3 py-2 text-xs text-muted">Enter a pincode to see freight and tax.</p>
            )}
            {error && <p role="alert" className="mt-4 text-sm text-crimson">{error}</p>}
            {orderError && <p role="alert" className="mt-4 rounded-lg bg-crimson-tint px-3 py-2.5 text-sm text-crimson-deep">{orderError}</p>}
            {razorpay.failed && (
              <p className="mt-4 text-sm text-warning">
                The payment window could not load. Check any ad blocker and refresh.
              </p>
            )}

            {otpStep ? (
              /* Deliberately NOT a nested <form> — the whole checkout is one
                 already, and nesting forms is invalid HTML that browsers
                 resolve by dropping the inner one. Enter is handled by hand. */
              <div className="mt-5 rounded-2xl border border-line bg-sand p-4">
                <p className="text-sm font-semibold text-content">Confirm your number</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  We sent a 6-digit code to +91 {address.phone}. This is how the courier
                  reaches you on delivery day.
                </p>

                <input
                  value={otpCode}
                  onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(null); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); if (otpCode.length === 6) void confirmCode(); }
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="6-digit code"
                  autoFocus
                  placeholder="······"
                  className="numeric mt-3 h-12 w-full rounded-xl border border-line bg-surface px-4 text-center text-lg tracking-[0.4em] text-content outline-none transition-colors placeholder:text-faint focus:border-ink focus:ring-2 focus:ring-crimson/15"
                />

                {devCode && (
                  <p className="mt-2 text-center text-xs text-faint">Development code: {devCode}</p>
                )}
                {otpError && <p role="alert" className="mt-2 text-sm text-crimson">{otpError}</p>}

                <Button
                  type="button"
                  size="lg"
                  loading={otpBusy || placing}
                  disabled={otpCode.length !== 6}
                  onClick={() => void confirmCode()}
                  className="mt-3 w-full"
                >
                  Verify and pay {quote ? formatINR(quote.grandTotal) : ''}
                </Button>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => { setOtpStep(false); setOtpCode(''); setOtpError(null); }}
                    className="cursor-pointer text-muted underline underline-offset-2 hover:text-content"
                  >
                    Change number
                  </button>
                  <button
                    type="button"
                    disabled={resendIn > 0 || otpBusy}
                    onClick={() => void startVerification()}
                    className="cursor-pointer text-muted underline underline-offset-2 hover:text-content disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Button
                  type="submit"
                  size="lg"
                  loading={placing || otpBusy}
                  disabled={!quote || quoting}
                  className="mt-5 w-full"
                >
                  {quote ? (
                    <>
                      <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" />
                        <path d="M7 9V6.5a3 3 0 0 1 6 0V9" strokeLinecap="round" />
                      </svg>
                      Pay {formatINR(quote.grandTotal)}
                    </>
                  ) : 'Enter your address'}
                </Button>

                {/* Says what happens next, so the code is expected rather than
                    an interruption between deciding to buy and paying. */}
                {!user && quote && (
                  <p className="mt-3 text-center text-xs text-faint">
                    We will text a 6-digit code to confirm your number.{' '}
                    <button
                      type="button"
                      onClick={openSignIn}
                      className="cursor-pointer underline underline-offset-2 hover:text-content"
                    >
                      Ordered before? Sign in
                    </button>
                  </p>
                )}

                <p className="mt-3 text-center text-xs text-faint">
                  Secured by Razorpay · UPI, cards, net banking and EMI
                </p>
              </>
            )}

            <ul className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center text-[0.6875rem] leading-snug text-muted">
              {['Encrypted payment', 'GST invoice included', '12–36 month warranty'].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </form>
    </>
  );
}

/** A numbered card on the checkout form: the number says "step", the card says "one job". */
function Section({
  n, title, description, optional, children,
}: { n: number; title: string; description?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-6">
      <header className="mb-5 flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-on-ink" aria-hidden="true">{n}</span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold leading-tight tracking-[-0.015em] text-content">
            {title}
            {optional && <span className="ml-2 font-body text-xs font-normal text-faint">Optional</span>}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}
