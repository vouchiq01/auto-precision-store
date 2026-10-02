import { logger } from '../../lib/logger.ts';
import type { WhatsappProvider } from './provider.ts';

/**
 * Development provider. Prints the message to the server log instead of
 * sending it, so the rest of the order flow can be built and tested before
 * a real Meta WhatsApp Business app exists or has an approved template.
 *
 * env.ts only warns (does not refuse to boot) when this is active in
 * production — WhatsApp notifications matter, but not the way OTP or payment
 * do, and the store must be able to go live before template approval lands.
 */
export class MockWhatsappProvider implements WhatsappProvider {
  readonly name = 'mock';

  async sendTemplate(params: {
    to: string; template: string; languageCode: string; bodyParams: string[];
  }): Promise<{ messageId: string }> {
    logger.info(
      { to: params.to, template: params.template, params: params.bodyParams },
      `\n\n  ┌─────────────────────────────────────────────┐\n  │  WhatsApp to ${params.to}\n  │  template: ${params.template} (${params.languageCode})\n  │  params: ${params.bodyParams.join(' | ')}\n  └─────────────────────────────────────────────┘\n`,
    );
    return { messageId: `mock-${Date.now()}` };
  }
}
