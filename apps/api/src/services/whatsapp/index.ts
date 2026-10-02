import { env } from '../../env.ts';
import { logger } from '../../lib/logger.ts';
import { MockWhatsappProvider } from './mock.provider.ts';
import { MetaWhatsappProvider } from './meta.provider.ts';
import type { WhatsappProvider } from './provider.ts';

let provider: WhatsappProvider | null = null;

/** The one line that decides who actually sends order-event WhatsApp messages. */
export function getWhatsappProvider(): WhatsappProvider {
  if (!provider) {
    provider = env.WHATSAPP_PROVIDER === 'meta' ? new MetaWhatsappProvider() : new MockWhatsappProvider();
    logger.info({ provider: provider.name }, 'WhatsApp provider initialised');
  }
  return provider;
}

/** Test-only: force a specific provider instance (and let a later call reset it). */
export function setWhatsappProvider(next: WhatsappProvider | null): void {
  provider = next;
}

export * from './provider.ts';
