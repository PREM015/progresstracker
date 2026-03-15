# 🗄️ Prisma Command Cheatsheet

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## ⚡ Daily Development

| Command | Usage |
|---------|-------|
| `npx prisma generate` | Regenerate Prisma Client (run after any schema change) |
| `npx prisma studio` | Open the Prisma database GUI (`http://localhost:5555`) |
| `npx prisma format` | Format the `schema.prisma` file properly |
| `npx prisma validate` | Validate the schema syntax without generating client |

---

## 🔄 Migrations (Development)

| Command | Usage |
|---------|-------|
| `npx prisma migrate dev` | Apply schema changes and create a migration file |
| `npx prisma migrate dev --name init` | Name the migration directly |
| `npx prisma migrate reset` | **DANGER**: Drop DB, recreate, run all migrations, and seed |
| `npx prisma db push` | Push schema directly to DB *without* creating migration (prototyping only) |

---

## 🚀 Migrations (Production)

| Command | Usage |
|---------|-------|
| `npx prisma migrate deploy` | Apply pending migrations to the production DB |
| `npx prisma migrate status` | Check which migrations have been applied |
| `npx prisma migrate resolve --applied 2026...` | Mark a failed migration as applied (manual fix) |

---

## 🌱 Seeding & Data

| Command | Usage |
|---------|-------|
| `npx prisma db seed` | Run the seed script defined in `package.json` |
| `npx prisma db pull` | Introspect an existing DB and update `schema.prisma` |

---

## 📝 Common Prisma Client Patterns

### Find with Relations
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    goals: {
      where: { status: 'ACTIVE' }
    }
  }
});
```

### Upsert (Update or Create)
```typescript
const entry = await prisma.trackerEntry.upsert({
  where: { 
    userId_platformId_date: { userId, platformId, date }
  },
  update: { problemsSolved: 5 },
  create: { userId, platformId, date, problemsSolved: 5, category: 'DSA' }
});
```

### Transactions
```typescript
const [user, goal] = await prisma.$transaction([
  prisma.user.update({ where: { id: userId }, data: { totalPoints: { increment: 100 } } }),
  prisma.goal.update({ where: { id: goalId }, data: { status: 'COMPLETED' } })
]);
```

## 📎 Related Docs
- [Migrations Guide](../database/05-migrations-guide.md)
- [Database Setup](../deployment/04-database-setup.md)
