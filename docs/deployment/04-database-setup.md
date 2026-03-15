# 🗄️ Database Setup Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## ⚡ Quick Options

| Provider | Free Tier | Recommended For |
|----------|-----------|----------------|
| **Neon** | 10GB | Development + Production |
| **Supabase** | 500MB | Development |
| **Local PostgreSQL** | - | Local dev only |
| **PlanetScale** | ❌ (deprecated free) | - |

---

## 🌟 Neon Setup (Recommended)

1. Sign up at [neon.tech](https://neon.tech)
2. Create Project → Select region (us-east-1 recommended)
3. Copy **Connection String** (pooler mode):
   ```
   postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Set in environment:
   ```env
   DATABASE_URL=postgresql://...?sslmode=require&pgbouncer=true
   DIRECT_DATABASE_URL=postgresql://...?sslmode=require
   ```
   > `DIRECT_DATABASE_URL` is needed for Prisma migrations (bypasses pgBouncer)

---

## 🛠️ Running Migrations

### Development

```bash
# Run all pending migrations
npm run prisma:migrate:dev

# Or create a new migration
npx prisma migrate dev --name your_migration_name
```

### Production (Vercel)

Migrations run automatically as part of the build command:
```
npm run prisma:generate && npx prisma migrate deploy && next build
```

Or add to `vercel.json` build command.

---

## 📊 Prisma Studio (Database GUI)

View and edit data in a visual interface:

```bash
npm run prisma:studio
# Opens at http://localhost:5555
```

---

## 💾 Backups

For production:

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql $DATABASE_URL < backup_file.sql
```

Neon provides automatic daily backups (Pro plan).

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `P1001: Can't reach database server` | Check DATABASE_URL format and network |
| `P3009: migrate failed` | Check if DB user has SUPERUSER or CREATEDB rights |
| `P3005: Schema drift` | Run `prisma migrate resolve` |
| SSL errors | Add `?sslmode=require` to connection string |

---

## 📎 Related Docs

- [Local Setup](01-local-setup.md)
- [Migrations Guide](../database/05-migrations-guide.md)
