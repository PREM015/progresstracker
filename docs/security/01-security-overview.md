# 🔒 Security Overview

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Security Model

ProgressTracker follows **defense in depth** — multiple layers of security so that no single failure compromises the system.

---

## 🛡️ Security Layers

### 1. Transport Layer
- ✅ HTTPS enforced (Vercel provides TLS by default)
- ✅ HSTS headers
- ✅ HTTP/2 with TLS 1.3

### 2. Authentication Layer
- ✅ NextAuth.js with secure session management
- ✅ Password hashing: bcryptjs with 12 salt rounds
- ✅ OAuth 2.0 for social logins (tokens never exposed to client)
- ✅ JWT sessions with short expiry + rotation
- ✅ Two-factor authentication (TOTP)
- ✅ Brute force protection (rate limit + account lockout)

### 3. Authorization Layer
- ✅ All API routes verify session
- ✅ All resources verified as belonging to the authenticated user
- ✅ Admin routes require `role: admin`
- ✅ Plan-based feature gating

### 4. Input Validation Layer
- ✅ Zod schema validation on all API inputs
- ✅ Prisma ORM prevents SQL injection
- ✅ React's JSX escaping prevents XSS
- ✅ CSRF protection via NextAuth (double-submit cookie)

### 5. Data Layer
- ✅ OAuth tokens encrypted at rest (AES-256)
- ✅ No sensitive data in logs
- ✅ Soft deletes for audit trail
- ✅ Comprehensive `AuditLog` model

---

## 🚦 Security Headers

```typescript
// next.config.ts
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval'; ..."
  }
]
```

---

## 🔑 Secret Management

| Secret | Storage | Access |
|--------|---------|--------|
| Database URL | Vercel env vars | Server-only |
| NextAuth secret | Vercel env vars | Server-only |
| Stripe secret key | Vercel env vars | Server-only |
| OAuth tokens | DB (encrypted) | Server-only |
| VAPID private key | Vercel env vars | Server-only |

**Never exposed to client:**
- API keys
- Database credentials
- Encryption keys
- Private OAuth tokens

---

## 🚨 Incident Response

1. **Detected**: Security alert via Sentry / user report
2. **Assess**: Determine scope and impact
3. **Contain**: Rotate affected credentials, invalidate sessions
4. **Fix**: Deploy patch
5. **Disclose**: Notify affected users if PII exposed
6. **Review**: Post-mortem document

---

## 📎 Related Docs

- [Data Protection](02-data-protection.md)
- [Audit Logging](03-audit-logging.md)
- [SECURITY.md](../../SECURITY.md)
- [Authentication Flow](../auth/01-authentication-flow.md)
