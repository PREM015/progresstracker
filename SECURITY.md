# 🔐 Security Policy

> **Last Updated**: 2026-03-15 | **Version**: 1.0

---

## 🛡️ Supported Versions

We actively maintain security updates for the following versions:

| Version | Supported |
|---------|-----------|
| 1.5.x | ✅ Active |
| 1.4.x | ✅ Security fixes only |
| 1.3.x | ⚠️ Critical only |
| < 1.3 | ❌ Not supported |

---

## 🚨 Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

### How to Report

1. **Email**: security@progresstracker.app
2. **Subject**: `[SECURITY] Brief description of the vulnerability`
3. **Include** (as much as possible):
   - Type of vulnerability (XSS, SQLi, CSRF, etc.)
   - Affected URL/endpoint
   - Steps to reproduce
   - Potential impact
   - Suggested fix (optional)

### What to Expect

| Timeframe | Action |
|-----------|--------|
| **24 hours** | Acknowledgment of your report |
| **72 hours** | Initial assessment of severity |
| **7 days** | Fix timeline communication |
| **30 days** | Public disclosure (after fix is deployed) |

---

## 🔒 Security Measures

### Authentication & Authorization
- ✅ NextAuth.js with secure session management
- ✅ Password hashing with bcryptjs (12 rounds)
- ✅ OAuth 2.0 for social logins
- ✅ JWT tokens with short expiry
- ✅ Refresh token rotation
- ✅ Two-factor authentication (TOTP)

### Data Protection
- ✅ All data encrypted in transit (TLS 1.3)
- ✅ Sensitive tokens encrypted at rest (AES-256)
- ✅ Password never stored in plaintext
- ✅ API keys hashed before storage
- ✅ PII fields encrypted in database

### API Security
- ✅ Rate limiting: 100 req/15min per IP
- ✅ Input validation with Zod schemas
- ✅ SQL injection prevention via Prisma ORM
- ✅ XSS protection via React's built-in escaping
- ✅ CSRF protection via NextAuth

### Infrastructure
- ✅ HTTPS enforced everywhere
- ✅ Security headers (CSP, HSTS, X-Frame-Options)
- ✅ Dependency vulnerability scanning (npm audit)
- ✅ Automated security updates via Dependabot

---

## 🏆 Hall of Fame

We recognize security researchers who responsibly disclose vulnerabilities:

*No public vulnerabilities reported yet.*

---

## 📋 Disclosure Policy

We follow a **90-day responsible disclosure** policy:
- Fix deployed within 30 days (typically much faster)
- Public disclosure after fix is deployed
- Credit given to reporter (with permission)

---

> 📧 Contact: security@progresstracker.app
