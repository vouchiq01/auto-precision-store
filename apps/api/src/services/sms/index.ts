import { env } from '../../env.ts';
import { logger } from '../../lib/logger.ts';
import { MockSmsProvider } from './mock.provider.ts';
import { Msg91SmsProvider } from './msg91.provider.ts';
import type { SmsProvider } from './provider.ts';

let provider: SmsProvider | null = null;

/** The one line that decides who sends your OTPs. */
export function getSmsProvider(): SmsProvider {
  if (!provider) {
    provider = env.SMS_PROVIDER === 'msg91' ? new Msg91SmsProvider() : new MockSmsProvider();
    logger.info({ provider: provider.name }, 'SMS provider initialised');
  }
  return provider;
}

/** True when the fixed development code should also be accepted. */
export function acceptsDevOtp(): boolean {
  return env.SMS_PROVIDER === 'mock';
}

export * from './provider.ts';
