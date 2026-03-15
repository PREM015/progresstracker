# 🔌 API Overview

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 📋 Table of Contents
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Request Format](#request-format)
- [Response Format](#response-format)
- [Common Headers](#common-headers)
- [API Versioning](#api-versioning)

---

## 🌐 Base URL

| Environment | URL |
|-------------|-----|
| **Production** | `https://vriddhi-app.vercel.app/api` |
| **Development** | `http://localhost:3000/api` |

---

## 🔐 Authentication

Most endpoints require authentication. We support two methods:

### 1. Session Cookie (Browser)

Used automatically when logged in via the web app. NextAuth manages the session cookie.

### 2. API Key (Programmatic)

For external integrations. Include in the `Authorization` header:

```http
Authorization: Bearer pt_live_your_api_key_here
```

**Get your API key**: Settings → API Keys → Generate Key

### Public Endpoints (No Auth Required)

```
GET /api/health
POST /api/auth/login
POST /api/auth/register
POST /api/auth/forgot-password
GET /api/platforms              (platform catalog)
GET /api/share/:slug            (public profile)
```

---

## 📦 Request Format

All requests with a body should use `Content-Type: application/json`:

```http
POST /api/tracker
Content-Type: application/json
Authorization: Bearer pt_live_abc123

{
  "platformId": "clxyz123",
  "category": "DSA",
  "problemsSolved": 5,
  "date": "2026-03-15",
  "notes": "Solved 5 easy problems"
}
```

---

## 📤 Response Format

All responses return JSON.

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "clxyz",
    "problemsSolved": 5,
    "date": "2026-03-15T00:00:00.000Z"
  },
  "message": "Entry created successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": [
    { "field": "date", "message": "Invalid date format" }
  ]
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 📡 Common Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Required for POST/PUT |
| `Authorization` | `Bearer <token>` | API key auth |
| `X-Request-ID` | UUID | Optional: trace requests |

### Response Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests per window |
| `X-RateLimit-Remaining` | Requests left in window |
| `X-RateLimit-Reset` | When the window resets (Unix timestamp) |

---

## 🔢 HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (no auth / invalid token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found |
| `409` | Conflict (duplicate entry) |
| `429` | Too Many Requests (rate limited) |
| `500` | Internal Server Error |

---

## 🔄 API Versioning

Currently at **v1** (no version prefix in URL). When breaking changes are needed, endpoints will be versioned:

```
/api/v2/tracker    (future)
```

---

## 📎 Related Docs

- [Endpoints Reference](02-endpoints-reference.md)
- [Error Codes](03-error-codes.md)
- [Rate Limiting](04-rate-limiting.md)
- [Authentication Flow](../auth/01-authentication-flow.md)
