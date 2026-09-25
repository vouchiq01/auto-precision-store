'use client';

import { useCallback, useEffect, useState } from 'react';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void; on: (event: string, handler: (payload: unknown) => void) => void };
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; contact?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Loads Razorpay Checkout on demand.
 *
 * Deliberately not loaded in the root layout: it is a third-party script that
 * only matters on one page, and pulling it into every visit costs every visitor
 * a request they will probably never use.
 */
export function useRazorpay() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (window.Razorpay) { setReady(true); return; }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => setReady(true));
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setFailed(true);
    document.body.appendChild(script);
  }, []);

  const open = useCallback((options: RazorpayOptions) => {
    if (!window.Razorpay) throw new Error('Razorpay has not loaded yet.');
    const instance = new window.Razorpay(options);
    instance.open();
    return instance;
  }, []);

  return { ready, failed, open };
}
