# 🚦 Rate Limiting

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

ProgressTracker uses **Upstash Redis** sliding window rate limiting to protect the API from abuse.

---

## 📊 Rate Limit Rules

### By Endpoint Type

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| **General API** | 100 requests | 15 minutes |
| **Auth endpoints** | 10 requests | 15 minutes |
| **Sync endpoint** | 5 requests | 5 minutes |
| **Export endpoint** | 3 requests | 1 hour |
| **Email sending** | 5 requests | 1 hour |

### By Subscription Tier

| Tier | API Rate Limit |
|------|---------------|
| `FREE` | 100 req / 15min |
| `STARTER` | 300 req / 15min |
| `PRO` | 1000 req / 15min |
| `TEAM` | 3000 req / 15min |
| `ENTERPRISE` | Custom |

---

## 📡 Rate Limit Headers

Every response includes rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1710500000
Retry-After: 300
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests allowed in window |
| `X-RateLimit-Remaining` | Requests left in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `Retry-After` | Seconds to wait when rate limited (only on 429) |

---

## 🔴 Rate Limit Response (429)

```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please wait 5 minutes before retrying.",
  "retryAfter": 300
}
```

---

## 💻 Rate Limiting Implementation

```typescript
// src/lib/rateLimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// General API limiter
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "15 m"),
  analytics: true,
});

// Strict limiter for auth endpoints
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "15 m"),
  analytics: true,
});

// Usage in API route
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success, limit, remaining, reset } = await authLimiter.limit(ip);
  
  if (!success) {
    return Response.json(
      { error: "RATE_LIMIT_EXCEEDED", message: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
          "Retry-After": String(Math.round((reset - Date.now()) / 1000)),
        },
      }
    );
  }
  // ...
}
```

---

## 🔧 Handling Rate Limits (Client)

```typescript
async function apiCall(url: string) {
  const res = await fetch(url);
  
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60');
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    
    // Optional: auto-retry after delay
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return apiCall(url); // retry once
  }
  
  return res.json();
}
```

---

## 📎 Related Docs

- [Error Codes](03-error-codes.md)
- [API Overview](01-api-overview.md)
- [Caching Strategy](../performance/02-caching-strategy.md)
