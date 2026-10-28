'use client';

import { useState } from 'react';
import { whatsappLink } from '@aps/shared';
import { cn } from '@/lib/cn';

export function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.5a9.4 9.4 0 0 0-8 14.3L2.6 21.5l4.800-1.300A9.400 9.400 0 1 0 12 2.5zm0 1.8a7.6 7.6 0 1 1-3.9 14.1l-.3-.2-2.800.8.800-2.700-.2-.3A7.6 7.6 0 0 1 12 4.3zm-2.800 3.400c-.2 0-.5.100-.7.400-.3.300-1 1-1 2.400s1 2.800 1.200 3c.1.200 2 3.100 4.900 4.3 2.400 1 2.900.8 3.400.7.500-.1 1.700-.7 1.900-1.400.2-.7.200-1.200.2-1.400-.1-.1-.3-.2-.7-.4l-1.900-.9c-.3-.1-.5-.1-.7.100l-.9 1.100c-.2.200-.3.200-.6.100-.3-.2-1.200-.4-2.300-1.400-.9-.8-1.400-1.700-1.600-2-.2-.3 0-.5.100-.6l.4-.5.3-.5v-.5l-.9-2.200c-.2-.5-.4-.5-.6-.5z" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="7" y="7" width="9" height="9" rx="1.8" /><path d="M13 7V5.500A1.500 1.500 0 0 0 11.500 4H5.500A1.500 1.500 0 0 0 4 5.500v6A1.500 1.500 0 0 0 5.500 13H7" />
    </svg>
  );
}

/** Copies text; falls back to a hidden textarea where the async clipboard is blocked. Returns success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** A "Copied ✓" flash for a copy button. */
export function useCopied() {
  const [copied, setCopied] = useState(false);
  async function copy(text: string) {
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }
  return { copied, copy };
}

/**
 * Two small icons for one order row: open WhatsApp on that customer with the current status's message
 * already typed in (one tap, then Send in WhatsApp), and copy that same message. The message text is
 * built by the caller from the order's current status.
 */
export function RowWhatsappActions({ phone, text }: { phone: string | undefined; text: string }) {
  const { copied, copy } = useCopied();
  const link = whatsappLink(phone, text);
  const base = 'grid size-7 cursor-pointer place-items-center rounded-full border border-line transition-colors';
  return (
    <span className="mt-1 inline-flex items-center gap-1.5">
      {link ? (
        <a
          href={link} target="_blank" rel="noopener noreferrer"
          title="Message on WhatsApp" aria-label="Message this customer on WhatsApp"
          className={cn(base, 'text-[#128C4A] hover:border-[#128C4A] hover:bg-[#E8F7EE]')}
        >
          <WhatsappIcon className="size-4" />
        </a>
      ) : (
        <span title="No usable mobile number on this order" className={cn(base, 'cursor-not-allowed text-faint opacity-50')}>
          <WhatsappIcon className="size-4" />
        </span>
      )}
      <button
        type="button" onClick={() => void copy(text)}
        title="Copy the message" aria-label="Copy the message for this customer"
        className={cn(base, copied ? 'border-success text-success' : 'text-muted hover:border-line-strong hover:text-content')}
      >
        {copied ? <span className="text-xs">✓</span> : <CopyIcon className="size-3.5" />}
      </button>
    </span>
  );
}

/**
 * Appears under an order right after its status changes: the message for the new status, editable,
 * with one button that opens WhatsApp and one that copies it. Nothing is sent automatically — the
 * admin always presses Send inside WhatsApp.
 */
export function WhatsappComposer({
  phone, name, orderNumber, statusLabel, initialText, onClose,
}: {
  phone: string | undefined; name: string; orderNumber: string; statusLabel: string; initialText: string; onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const { copied, copy } = useCopied();
  const link = whatsappLink(phone, text);

  return (
    <div className="rounded-2xl border border-[#BFE6CF] bg-[#F1FAF5] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-content">
            <WhatsappIcon className="size-4 text-[#128C4A]" />
            Tell {name || 'the customer'} — order {orderNumber} is now {statusLabel.toLowerCase()}
          </p>
          <p className="mt-0.5 text-xs text-muted">Edit the message if you like. WhatsApp opens with it typed in; you press Send there.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Dismiss" className="cursor-pointer px-1 text-muted hover:text-content">✕</button>
      </div>

      <textarea
        value={text} onChange={(e) => setText(e.target.value)} rows={5} aria-label="WhatsApp message"
        className="mt-3 w-full resize-y rounded-xl border border-line bg-white px-3.5 py-3 text-sm leading-relaxed text-content outline-none focus:border-line-strong"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {link ? (
          <a
            href={link} target="_blank" rel="noopener noreferrer"
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-[#128C4A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0E7A40]"
          >
            <WhatsappIcon className="size-4" /> Send on WhatsApp
          </a>
        ) : (
          <span className="text-xs text-warning">This order has no usable mobile number — copy the message instead.</span>
        )}
        <button
          type="button" onClick={() => void copy(text)}
          className={cn(
            'inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border bg-white px-4 text-sm font-medium transition-colors',
            copied ? 'border-success text-success' : 'border-line text-content hover:border-line-strong',
          )}
        >
          <CopyIcon className="size-4" /> {copied ? 'Copied ✓' : 'Copy message'}
        </button>
        <button type="button" onClick={() => setText(initialText)} className="cursor-pointer px-2 text-xs text-muted hover:text-content">Reset</button>
      </div>
    </div>
  );
}
