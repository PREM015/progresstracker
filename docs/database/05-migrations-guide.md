# 🔄 Migrations Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## ⚡ Quick Reference

```bash
# Create migration (after schema changes)
npx prisma migrate dev --name describe_your_change

# Apply pending migrations (production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Reset DB and re-apply all migrations (dev only!)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate
```

---

## 🛠️ Workflow: Making Schema Changes

### Step 1: Update Schema

Edit `prisma/schema.prisma` with your changes:

```prisma
model User {
  // existing fields...
  
  // NEW: add a field
  bio String? @db.Text
}
```

### Step 2: Create Migration

```bash
npx prisma migrate dev --name add_bio_to_user
```

This creates `prisma/migrations/TIMESTAMP_add_bio_to_user/migration.sql`.

### Step 3: Verify Migration

```bash
# Check what changed
cat prisma/migrations/*/migration.sql

# Verify Prisma client is updated
npx prisma generate
```

### Step 4: Test Locally

```bash
# Start app and verify the new field works
npm run dev
```

### Step 5: Deploy to Production

```bash
# Production migrations run automatically via Vercel build command
# Or manually:
npx prisma migrate deploy
```

---

## ⚠️ Before Writing a Migration

| Scenario | Safe? | Notes |
|----------|-------|-------|
| Add optional field | ✅ Safe | No data migration needed |
| Add required field with default | ✅ Safe | Set `@default(value)` |
| Add required field without default | ⚠️ Careful | Need to provide value for existing rows |
| Rename field | ❌ Dangerous | Prisma will DROP + CREATE |
| Change field type | ⚠️ Careful | May need data migration |
| Delete field | ❌ Dangerous | Data is lost forever |

---

## 🗄️ Production Migration Process

```bash
# 1. Backup database first (always!)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. Review pending migrations
npx prisma migrate status

# 3. Deploy migrations
npx prisma migrate deploy

# 4. Verify application working
curl https://vriddhi-app.vercel.app/api/health
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `Migration failed` | Check SQL in migration file, fix and run again |
| `Drift detected` | Schema and DB are out of sync - resolve manually |
| `Cannot find module .prisma/client` | Run `npx prisma generate` |
| Prod DB won't migrate | Check connection string, run `prisma migrate status` |

---

## 📎 Related Docs

- [Schema Overview](01-schema-overview.md)
- [Local Setup](../deployment/01-local-setup.md)
- [Database Setup](../deployment/04-database-setup.md)
