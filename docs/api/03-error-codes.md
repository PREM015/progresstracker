# ❌ Error Codes Reference

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 📋 Error Response Format

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": []  // optional: validation details
}
```

---

## 🔐 Authentication Errors (401 / 403)

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | No session or invalid token |
| `INVALID_TOKEN` | 401 | API key is invalid or expired |
| `SESSION_EXPIRED` | 401 | Session has expired |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `ACCOUNT_BANNED` | 403 | User account is banned |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| `TWO_FACTOR_REQUIRED` | 403 | 2FA verification needed |
| `PLAN_LIMIT_EXCEEDED` | 403 | Feature not available on current plan |

---

## ✏️ Validation Errors (400)

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Request body failed Zod validation |
| `INVALID_DATE` | 400 | Date format is invalid |
| `INVALID_UUID` | 400 | Invalid ID format |
| `MISSING_FIELD` | 400 | Required field is missing |
| `FIELD_TOO_LONG` | 400 | Field exceeds max length |
| `INVALID_EMAIL` | 400 | Email format invalid |
| `WEAK_PASSWORD` | 400 | Password doesn't meet requirements |
| `INVALID_PAGE` | 400 | Page or limit parameter invalid |

### Validation Error with Details

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid input",
  "details": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Must be at least 8 characters" }
  ]
}
```

---

## 🔍 Not Found Errors (404)

| Code | HTTP | Description |
|------|------|-------------|
| `USER_NOT_FOUND` | 404 | User doesn't exist |
| `ENTRY_NOT_FOUND` | 404 | Tracker entry not found |
| `GOAL_NOT_FOUND` | 404 | Goal not found |
| `PLATFORM_NOT_FOUND` | 404 | Platform not found |
| `ACHIEVEMENT_NOT_FOUND` | 404 | Achievement not found |
| `EXPORT_NOT_FOUND` | 404 | Export job not found |
| `SHARE_NOT_FOUND` | 404 | Share link not found or expired |

---

## ⚡ Conflict Errors (409)

| Code | HTTP | Description |
|------|------|-------------|
| `EMAIL_ALREADY_EXISTS` | 409 | Email is already registered |
| `USERNAME_TAKEN` | 409 | Username is already taken |
| `PLATFORM_ALREADY_CONNECTED` | 409 | Platform already connected |
| `DUPLICATE_ENTRY` | 409 | Entry for this date/platform exists |
| `GOAL_ALREADY_ACTIVE` | 409 | Cannot have duplicate active goals |
| `TWO_FACTOR_ALREADY_ENABLED` | 409 | 2FA is already enabled |

---

## 🚦 Rate Limit Errors (429)

| Code | HTTP | Description |
|------|------|-------------|
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SYNC_RATE_LIMIT` | 429 | Sync too frequent (min 5 min interval) |
| `EMAIL_RATE_LIMIT` | 429 | Too many emails sent |

---

## 🔄 Sync Errors

| Code | HTTP | Description |
|------|------|-------------|
| `SYNC_FAILED` | 500 | Platform sync failed |
| `PLATFORM_AUTH_FAILED` | 400 | Platform credentials invalid |
| `PLATFORM_RATE_LIMITED` | 429 | External platform rate limited |
| `PLATFORM_UNAVAILABLE` | 503 | External platform is down |
| `INVALID_PLATFORM_CREDENTIALS` | 400 | API key or OAuth token invalid |

---

## 💳 Billing Errors

| Code | HTTP | Description |
|------|------|-------------|
| `PAYMENT_FAILED` | 402 | Payment processing failed |
| `SUBSCRIPTION_REQUIRED` | 403 | This feature requires a subscription |
| `INVALID_COUPON` | 400 | Coupon code invalid or expired |
| `COUPON_ALREADY_USED` | 409 | Coupon already redeemed |

---

## 🔧 Server Errors (500)

| Code | HTTP | Description |
|------|------|-------------|
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `EMAIL_SEND_FAILED` | 500 | Email could not be sent |
| `EXPORT_FAILED` | 500 | Export generation failed |

---

## 💡 Handling Errors (Client Side)

```typescript
async function fetchEntry(id: string) {
  const res = await fetch(`/api/tracker/${id}`);
  const data = await res.json();
  
  if (!res.ok) {
    switch (data.error) {
      case 'ENTRY_NOT_FOUND':
        // Show 404 UI
        break;
      case 'UNAUTHORIZED':
        // Redirect to login
        router.push('/login');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        // Show rate limit message with retry-after
        break;
      default:
        // Generic error toast
        toast.error(data.message);
    }
    return null;
  }
  
  return data.data;
}
```

---

## 📎 Related Docs

- [API Overview](01-api-overview.md)
- [Rate Limiting](04-rate-limiting.md)
