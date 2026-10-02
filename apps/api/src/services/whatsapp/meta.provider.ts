import { env } from '../../env.ts';
import { logger } from '../../lib/logger.ts';
import { WhatsappDeliveryError, type WhatsappProvider } from './provider.ts';

/**
 * WhatsApp Cloud API, direct — no BSP in between.
 *
 * Before this works you need, from Meta Business Manager:
 *   META_WHATSAPP_PHONE_NUMBER_ID       — the sending number's Phone Number ID
 *   META_WHATSAPP_ACCESS_TOKEN          — a permanent (system user) access token;
 *                                          a short-lived one will expire and start
 *                                          silently failing every notification
 *   META_WHATSAPP_BUSINESS_ACCOUNT_ID   — optional, only needed if you later
 *                                          manage templates through this app
 *   WHATSAPP_TEMPLATE_ORDER_PLACED      — an APPROVED template name for the
 *                                          seller-facing "new order" alert
 *   WHATSAPP_TEMPLATE_ORDER_STATUS      — an APPROVED template name for the
 *                                          buyer-facing status update
 *
 * Both templates are assumed to take positional body parameters only
 * ({{1}}, {{2}}, …) with no header/button variables — adjust buildPayload if
 * the templates you get approved use those too.
 */
export class MetaWhatsappProvider implements WhatsappProvider {
  readonly name = 'meta';

  async sendTemplate(params: {
    to: string; template: string; languageCode: string; bodyParams: string[];
  }): Promise<{ messageId: string }> {
    const phoneNumberId = env.META_WHATSAPP_PHONE_NUMBER_ID;
    const token = env.META_WHATSAPP_ACCESS_TOKEN;
    if (!phoneNumberId || !token) {
      throw new WhatsappDeliveryError(this.name, 'Meta WhatsApp Cloud API is not fully configured', false);
    }

    // The Cloud API wants the recipient as digits with country code, no "+".
    const to = params.to.replace(/^\+/, '').replace(/\s/g, '');

    const url = `https://graph.facebook.com/${env.META_WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;
    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: params.template,
        language: { code: params.languageCode },
        components: params.bodyParams.length > 0
          ? [{ type: 'body', parameters: params.bodyParams.map((text) => ({ type: 'text', text })) }]
          : [],
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (cause) {
      throw new WhatsappDeliveryError(this.name, `Could not reach the WhatsApp Cloud API: ${String(cause)}`, true);
    }

    const payload = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string; code?: number; error_subcode?: number };
    };

    if (!response.ok || payload.error) {
      /* Never log the access token; the error body itself can't contain it. */
      logger.error(
        { status: response.status, error: payload.error, template: params.template },
        'WhatsApp Cloud API rejected the message',
      );
      throw new WhatsappDeliveryError(
        this.name,
        payload.error?.message ?? `WhatsApp Cloud API returned ${response.status}`,
        response.status >= 500,
      );
    }

    return { messageId: payload.messages?.[0]?.id ?? `meta-${Date.now()}` };
  }
}
