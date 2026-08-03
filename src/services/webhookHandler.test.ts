import { describe, expect, it } from 'vitest';
import { validateLeadFields, webhookHandler, type WebhookLeadPayload } from './webhookHandler';

const valid: WebhookLeadPayload = {
  name: 'Youssef Nagar',
  email: 'youssef.n@enterprise.sa',
  phone: '+966 54 321 9876',
  campaignId: 'camp-101',
  campaignName: 'Meta_Broad_Fashion_Scaling_V4',
  portfolioId: 'port-1',
  sourcePlatform: 'meta',
  estimatedValue: 850,
};

describe('validateLeadFields', () => {
  it('accepts a complete payload', () => {
    expect(validateLeadFields(valid)).toEqual([]);
  });

  it.each([
    ['missing name', { ...valid, name: '   ' }],
    ['missing email', { ...valid, email: '' }],
    ['malformed email', { ...valid, email: 'not-an-email' }],
    ['email without domain', { ...valid, email: 'user@' }],
    ['missing campaign', { ...valid, campaignId: '' }],
    ['negative value', { ...valid, estimatedValue: -1 }],
    ['non-finite value', { ...valid, estimatedValue: Number.NaN }],
  ])('rejects: %s', (_label, payload) => {
    expect(validateLeadFields(payload).length).toBeGreaterThan(0);
  });

  it('treats an omitted estimatedValue as acceptable', () => {
    const { estimatedValue: _omitted, ...rest } = valid;
    expect(validateLeadFields(rest)).toEqual([]);
  });
});

describe('webhookHandler.processInboundLead', () => {
  it('rejects a payload with no portfolio', async () => {
    const result = await webhookHandler.processInboundLead({ ...valid, portfolioId: '' });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/portfolioId/);
  });

  it('rejects a malformed email before touching the store', async () => {
    const result = await webhookHandler.processInboundLead({ ...valid, email: 'nope' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid payload', async () => {
    const result = await webhookHandler.processInboundLead(valid);
    expect(result.success).toBe(true);
  });

  it('no longer exposes a client-side signature verifier', () => {
    // The removed `verifySignature` returned true when the header was absent
    // and otherwise only checked `length > 10`. A client-side HMAC check is
    // unimplementable (the secret would ship in the bundle), so the correct
    // fix was removal, not repair. This test pins that decision.
    expect('verifySignature' in webhookHandler).toBe(false);
  });
});
