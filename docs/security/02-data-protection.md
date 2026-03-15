# 🛡️ Data Protection

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

This document describes how user data is stored, encrypted, and protected in ProgressTracker.

---

## 🔐 Encryption at Rest

### OAuth Tokens

All OAuth access tokens and refresh tokens are encrypted before storage:

```typescript
// src/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64');

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
```

### 2FA Secrets

TOTP secrets are encrypted using the same AES-256-GCM method.

---

## 📊 Data Retention

| Data | Retention | Reason |
|------|-----------|--------|
| Tracker entries | Forever (until deleted) | User's data |
| Audit logs | 2 years | Security compliance |
| Session data | 30 days | Auto-expiry |
| Expired tokens | 7 days | Grace period |
| Deleted accounts | 30 days (soft delete) | Recovery window |
| Email logs | 90 days | Deliverability analysis |

---

## 👤 User Data Rights (GDPR)

| Right | Implementation |
|-------|---------------|
| Data Access | Export via `/api/export` |
| Data Portability | CSV/JSON export |
| Right to Erasure | Account deletion via `/api/user/account` |
| Data Correction | Profile update via `/api/user/profile` |

When account is deleted:
1. User data anonymized (email → `deleted_<id>@deleted.com`)
2. Personal info cleared (name, bio, image)
3. Data retained for 30 days, then purged

---

## 📎 Related Docs

- [Security Overview](01-security-overview.md)
- [Audit Logging](03-audit-logging.md)
