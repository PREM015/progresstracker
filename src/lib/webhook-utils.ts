// src/lib/webhook-utils.ts
// Webhook signing, verification, and payload building utilities

import type { WebhookEvent } from '@/types/webhook-info';

// =============================================================================
// TYPES
// =============================================================================

export interface WebhookPayload {
  id: string;
  type: WebhookEvent;
  userId: string;
  timestamp: string; // ISO 8601
  data: Record<string, unknown>;
  version: string;
}

export interface WebhookSignatureHeader {
  /** Comma-separated header value: t=timestamp,v1=signature */
  raw: string;
  timestamp: number;
  signature: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const WEBHOOK_SIGNATURE_HEADER = 'x-progresstracker-signature';
export const WEBHOOK_VERSION = '1';
export const WEBHOOK_SIGNATURE_TOLERANCE_SECONDS = 300; // 5 minutes

// =============================================================================
// PAYLOAD BUILDING
// =============================================================================

/**
 * Build a webhook payload object.
 */
export function buildWebhookPayload(
  type: WebhookEvent,
  userId: string,
  data: Record<string, unknown>
): WebhookPayload {
  return {
    id: crypto.randomUUID(),
    type,
    userId,
    timestamp: new Date().toISOString(),
    data,
    version: WEBHOOK_VERSION,
  };
}

// =============================================================================
// SIGNATURE (Web Crypto – works in Edge & Node.js)
// =============================================================================

/**
 * Create HMAC-SHA256 signature for a webhook payload.
 * Compatible with both Edge Runtime and Node.js.
 */
export async function signWebhookPayload(
  payload: string,
  secret: string,
  timestamp: number = Date.now()
): Promise<string> {
  const signingPayload = `${timestamp}.${payload}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(signingPayload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = new Uint8Array(signatureBuffer);
  const signature = Array.from(signatureArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Parse webhook signature header.
 */
export function parseWebhookSignature(header: string): WebhookSignatureHeader | null {
  try {
    const parts = header.split(',');
    const tPart = parts.find((p) => p.startsWith('t='));
    const v1Part = parts.find((p) => p.startsWith('v1='));

    if (!tPart || !v1Part) return null;

    const timestamp = parseInt(tPart.slice(2), 10);
    const signature = v1Part.slice(3);

    if (isNaN(timestamp) || !signature) return null;

    return { raw: header, timestamp, signature };
  } catch {
    return null;
  }
}

/**
 * Verify a webhook signature.
 */
export async function verifyWebhookSignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSeconds: number = WEBHOOK_SIGNATURE_TOLERANCE_SECONDS
): Promise<boolean> {
  const parsed = parseWebhookSignature(header);
  if (!parsed) return false;

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  const payloadTs = Math.floor(parsed.timestamp / 1000);
  if (Math.abs(now - payloadTs) > toleranceSeconds) return false;

  // Recompute signature
  const expected = await signWebhookPayload(payload, secret, parsed.timestamp);
  const expectedParsed = parseWebhookSignature(expected);
  if (!expectedParsed) return false;

  // Constant-time comparison
  return parsed.signature === expectedParsed.signature;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get headers to attach to a webhook HTTP request.
 */
export function getWebhookHeaders(signature: string, extraHeaders?: Record<string, string>): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'ProgressTracker-Webhooks/1.0',
    [WEBHOOK_SIGNATURE_HEADER]: signature,
    ...extraHeaders,
  };
}

/**
 * Format webhook delivery attempt status for display.
 */
export function getWebhookDeliveryStatusLabel(statusCode: number | null | undefined): string {
  if (!statusCode) return 'No response';
  if (statusCode >= 200 && statusCode < 300) return `✅ ${statusCode} OK`;
  if (statusCode >= 400 && statusCode < 500) return `⚠️ ${statusCode} Client Error`;
  if (statusCode >= 500) return `❌ ${statusCode} Server Error`;
  return `${statusCode}`;
}
