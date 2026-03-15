# 🔧 Sync Troubleshooting

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🔍 Common Sync Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| "Sync Failed" for GitHub | OAuth token expired | Reconnect GitHub in Settings → Platforms |
| LeetCode shows 0 problems | Username not set / private profile | Verify username in platform settings; ensure public profile |
| Sync running forever | Trigger.dev job stuck | Check Trigger.dev dashboard; re-trigger manually |
| Data not updating | Long cache | Force refresh with `?force=true` query param |
| "Platform rate limited" | Too many requests | Wait 1 hour and retry |
| "Invalid credentials" | API key changed | Re-enter API key in platform settings |

---

## 🔍 Debugging a Failed Sync

### Step 1: Check Sync Logs

```http
GET /api/sync/logs?limit=10

Response:
{
  "data": [{
    "id": "cl123",
    "status": "FAILED",
    "errorMessage": "GitHub token expired",
    "platformId": "github",
    "createdAt": "2026-03-15T10:00:00Z"
  }]
}
```

### Step 2: Test Platform Connection

```http
POST /api/platforms/github/test

Response:
{
  "success": false,
  "error": "PLATFORM_AUTH_FAILED",
  "message": "GitHub token is expired or revoked"
}
```

### Step 3: Reconnect Platform

1. Go to **Settings → Connected Platforms**
2. Find the failing platform
3. Click **Disconnect** → **Reconnect**
4. Complete OAuth flow
5. Click **Sync Now**

---

## 🖥️ Self-Hosted Sync Issues

### Verify Environment Variables

```bash
# Check Encryption key is set (required for token decryption)
echo $ENCRYPTION_KEY

# Check Trigger.dev connection
curl https://api.trigger.dev/api/v1/projects \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY"
```

---

## 📎 Related Docs

- [Sync Architecture](01-sync-architecture.md)
- [Platform Scrapers](02-platform-scrapers.md)
