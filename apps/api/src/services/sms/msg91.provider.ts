import { env } from '../../env.ts';
import { logger } from '../../lib/logger.ts';
import { SmsDeliveryError, type SmsProvider } from './provider.ts';

/**
 * MSG91, the production provider for India.
 *
 * Chosen over Twilio because TRAI's DLT regime requires every transactional SMS
 * to quote a registered template and sender id; MSG91 handles that registration
 * natively and costs roughly a tenth as much per message on Indian numbers.
 *
 * Before this works you need, from the MSG91 dashboard:
 *   MSG91_AUTH_KEY      — account auth key
 *   MSG91_TEMPLATE_ID   — a DLT-approved template containing ##OTP##
 *   MSG91_SENDER_ID     — your 6-character registered sender id
 */
export class Msg91SmsProvider implements SmsProvider {
  readonly name = 'msg91';

  async sendOtp(phone: string, code: string): Promise<{ messageId: string }> {
    const authKey = env.MSG91_AUTH_KEY;
    const templateId = env.MSG91_TEMPLATE_ID;
    if (!authKey || !templateId) {
      throw new SmsDeliveryError(this.name, 'MSG91 is not fully configured', false);
    }

    // MSG91 wants the number without a leading + but with the country code.
    const recipient = phone.replace(/^\+/, '');

    const url = new URL('https://control.msg91.com/api/v5/otp');
    url.searchParams.set('template_id', templateId);
    url.searchParams.set('mobile', recipient);
    url.searchParams.set('otp', code);
    if (env.MSG91_SENDER_ID) url.searchParams.set('sender', env.MSG91_SENDER_ID);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { authkey: authKey, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (cause) {
      // Network failure or timeout — worth retrying, so say so.
      throw new SmsDeliveryError(this.name, `Could not reach MSG91: ${String(cause)}`, true);
    }

    const body = (await response.json().catch(() => ({}))) as { type?: string; message?: string; request_id?: string };

    if (!response.ok || body.type === 'error') {
      logger.error({ status: response.status, body }, 'MSG91 rejected the OTP request');
      throw new SmsDeliveryError(this.name, body.message ?? `MSG91 returned ${response.status}`, response.status >= 500);
    }

    return { messageId: body.request_id ?? `msg91-${Date.now()}` };
  }
}
