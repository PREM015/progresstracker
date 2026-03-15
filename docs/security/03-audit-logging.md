# 📋 Audit Logging

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

All sensitive user actions are recorded in the `AuditLog` table for security auditing, compliance, and debugging.

---

## 📊 Logged Actions

| Category | Actions Logged |
|----------|---------------|
| **Auth** | LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_CHANGE, PASSWORD_RESET |
| **Account** | EMAIL_CHANGE, SETTINGS_CHANGE, ACCOUNT_DELETE |
| **2FA** | TWO_FACTOR_ENABLE, TWO_FACTOR_DISABLE |
| **Data** | EXPORT_DATA, IMPORT_DATA |
| **Billing** | SUBSCRIPTION_CHANGE |
| **API** | API_KEY_CREATE, API_KEY_DELETE |
| **Admin** | ADMIN_ACTION |
| **Sharing** | SHARE_CREATE, SHARE_ACCESS |
| **Sync** | SYNC_TRIGGER |

---

## 🗄️ AuditLog Schema

```prisma
model AuditLog {
  id        String      @id @default(cuid())
  userId    String?
  action    AuditAction
  resource  String?     // e.g., "goal:clxyz" 
  ipAddress String?
  userAgent String?
  metadata  Json?       // additional context
  createdAt DateTime    @default(now())
  
  user      User?       @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

---

## ⚙️ Creating Audit Logs

```typescript
// src/lib/auditLog.ts
export async function log(
  userId: string | null,
  action: AuditAction,
  options?: { resource?: string; metadata?: object; request?: Request }
) {
  const ip = options?.request?.headers.get('x-forwarded-for') ?? null;
  const ua = options?.request?.headers.get('user-agent') ?? null;

  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resource: options?.resource,
      ipAddress: ip,
      userAgent: ua,
      metadata: options?.metadata ? JSON.stringify(options.metadata) : undefined,
    }
  });
}

// Usage in API route
await log(session.user.id, 'PASSWORD_CHANGE', {
  request: req,
  metadata: { reason: 'user_initiated' }
});
```

---

## 🔍 Querying Audit Logs

Admin can view audit logs:
```http
GET /api/admin/audit-logs?userId=xxx&action=LOGIN_FAILED&limit=50
```

---

## 📎 Related Docs

- [Security Overview](01-security-overview.md)
- [Data Protection](02-data-protection.md)
