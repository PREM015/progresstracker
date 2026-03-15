# 🗺️ Migration Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🔄 Version Migration Guides

---

## v1.4.x → v1.5.x

### Breaking Changes

1. **`sib-api-v3-sdk` removed** - Replaced with `@getbrevo/brevo`
2. **`otplib` removed** - Custom TOTP implementation now used
3. **Email environment variables updated**

### Migration Steps

```bash
# 1. Update dependencies
npm install

# 2. Run database migrations (new 2FA and export tables)
npm run prisma:migrate

# 3. Update environment variables
# OLD: SENDGRID_API_KEY → REMOVE
# NEW: BREVO_API_KEY → ADD
```

### Updated Environment Variables

| Old | New | Action |
|-----|-----|--------|
| `SMTP_HOST` | - | Remove |
| `SMTP_USER` | - | Remove |
| `SMTP_PASS` | - | Remove |
| - | `BREVO_API_KEY` | Add |
| - | `BREVO_EMAIL` | Add |

---

## v1.3.x → v1.4.x

### New Tables Added

```sql
-- New in v1.4
TwoFactorAuth
BackupCode
ActiveSession
RefreshToken
```

```bash
# Run migrations
npm run prisma:migrate
```

### Breaking Changes

- Sessions now require `NEXTAUTH_SECRET` to be exactly 32+ characters
- New 2FA endpoints added

---

## v1.2.x → v1.3.x

### Stripe Integration Added

New environment variables required:
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

```bash
# Run migrations (new billing tables)
npm run prisma:migrate
```

---

## 📎 Related Docs

- [Changelog](../../CHANGELOG.md)
- [Environment Variables](../deployment/02-environment-variables.md)
