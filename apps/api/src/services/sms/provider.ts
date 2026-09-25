/**
 * The seam between our OTP logic and whoever actually delivers the SMS.
 *
 * Swapping MSG91 for Twilio, or adding a WhatsApp fallback, means writing one
 * more implementation of this interface and changing one line in factory.ts.
 * Nothing in the auth service knows which provider is in use.
 */
export interface SmsProvider {
  readonly name: string;
  sendOtp(phone: string, code: string): Promise<{ messageId: string }>;
}

export class SmsDeliveryError extends Error {
  readonly provider: string;
  readonly retryable: boolean;
  constructor(provider: string, message: string, retryable = true) {
    super(message);
    this.name = 'SmsDeliveryError';
    this.provider = provider;
    this.retryable = retryable;
  }
}
