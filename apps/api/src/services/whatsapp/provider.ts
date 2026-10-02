/**
 * The seam between our order-event notifications and whoever actually
 * delivers the WhatsApp message. Mirrors services/sms/provider.ts.
 *
 * A template message, not a free-form one: WhatsApp only allows free text as
 * a reply inside the 24-hour window after the CUSTOMER messaged first. Every
 * message here is business-initiated (we are telling someone their order
 * moved), so it must use a template Meta has already approved, and the
 * provider sends {{1}}, {{2}}, … positional parameters into that template's
 * body — it never has to know what the template actually says.
 */
export interface WhatsappProvider {
  readonly name: string;
  sendTemplate(params: {
    to: string;
    template: string;
    languageCode: string;
    bodyParams: string[];
  }): Promise<{ messageId: string }>;
}

export class WhatsappDeliveryError extends Error {
  readonly provider: string;
  readonly retryable: boolean;
  constructor(provider: string, message: string, retryable = true) {
    super(message);
    this.name = 'WhatsappDeliveryError';
    this.provider = provider;
    this.retryable = retryable;
  }
}
