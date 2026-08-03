import type { Platform } from '../types/mediaBuyer';
import { apiService } from './apiService';

/**
 * ⚠️ SCOPE OF THIS MODULE
 *
 * This simulates the *result* of an inbound lead webhook so the demo has
 * something to react to. It is NOT a webhook endpoint and must never be
 * treated as one.
 *
 * Real Meta / TikTok Lead Ads ingestion has to run server-side, because:
 *   1. HMAC verification requires the app secret. Anything shipped to the
 *      browser is public, so a client-side signature check is unfalsifiable
 *      theatre — an attacker simply omits or forges the header.
 *   2. The platform posts to a public URL; a SPA has no URL to post to.
 *   3. Replay protection needs a server-side seen-signature store.
 *
 * The previous implementation had a `verifySignature()` that returned `true`
 * when the signature header was absent and otherwise only checked
 * `signature.length > 10`. That has been removed rather than "fixed", because
 * a correct implementation is not possible in this layer.
 *
 * See the deployment notes in README.md for the intended server-side design.
 */

export interface WebhookLeadPayload {
  name: string;
  email: string;
  phone: string;
  campaignId: string;
  campaignName: string;
  portfolioId: string;
  sourcePlatform: Platform;
  estimatedValue?: number;
  notes?: string;
}

export interface IngestResult {
  success: boolean;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates the fields a lead must carry regardless of where it came from
 * (manual entry or inbound webhook). Returns human-readable problems; an
 * empty array means valid.
 */
export function validateLeadFields(
  fields: Partial<Pick<WebhookLeadPayload, 'name' | 'email' | 'campaignId' | 'estimatedValue'>>,
): string[] {
  const errors: string[] = [];
  if (!fields.name?.trim()) errors.push('الاسم مطلوب');
  if (!fields.email?.trim()) errors.push('البريد الإلكتروني مطلوب');
  else if (!EMAIL_RE.test(fields.email)) errors.push('صيغة البريد الإلكتروني غير صحيحة');
  if (!fields.campaignId?.trim()) errors.push('يجب اختيار حملة');
  if (fields.estimatedValue !== undefined) {
    if (!Number.isFinite(fields.estimatedValue) || fields.estimatedValue < 0) {
      errors.push('القيمة المتوقعة يجب أن تكون رقماً غير سالب');
    }
  }
  return errors;
}

export const webhookHandler = {
  async processInboundLead(payload: WebhookLeadPayload): Promise<IngestResult> {
    const errors = validateLeadFields(payload);
    if (!payload.portfolioId?.trim()) errors.push('portfolioId is required');
    if (errors.length > 0) {
      return { success: false, message: `Rejected payload: ${errors.join(', ')}` };
    }

    try {
      await apiService.addLead({
        portfolioId: payload.portfolioId,
        campaignId: payload.campaignId,
        campaignName: payload.campaignName,
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone.trim(),
        sourcePlatform: payload.sourcePlatform,
        status: 'registered',
        estimatedValue: payload.estimatedValue ?? 0,
        notes: payload.notes,
      });
      return { success: true, message: 'Lead captured and assigned to the CRM pipeline' };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Lead ingestion failed',
      };
    }
  },
};
