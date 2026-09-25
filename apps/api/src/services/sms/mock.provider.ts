import { logger } from '../../lib/logger.ts';
import type { SmsProvider } from './provider.ts';

/**
 * Development provider. Prints the code to the server log instead of sending it,
 * and the auth service additionally accepts the fixed code 123456 while this
 * provider is active.
 *
 * env.ts refuses to boot in production with SMS_PROVIDER=mock, so this cannot
 * reach real users by accident.
 */
export class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';

  async sendOtp(phone: string, code: string): Promise<{ messageId: string }> {
    logger.info(
      { phone, code },
      `\n\n  ┌─────────────────────────────────────┐\n  │  OTP for ${phone}: ${code}   │\n  │  (dev code 123456 also works)       │\n  └─────────────────────────────────────┘\n`,
    );
    return { messageId: `mock-${Date.now()}` };
  }
}
