# 🚀 Local Development Setup

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## ⚡ Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v18.x+ | [nodejs.org](https://nodejs.org) |
| npm | v9.x+ | Included with Node.js |
| Git | Latest | [git-scm.com](https://git-scm.com) |
| PostgreSQL | v14+ | [postgresql.org](https://postgresql.org) |

> **Tip**: Use [Neon.tech](https://neon.tech) (free) for a cloud PostgreSQL instead of local.

---

## 🏃 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/PREM015/progresstracker.git
cd progresstracker

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
```

Now edit `.env.local` with your values (see [Environment Variables](02-environment-variables.md)):

```env
# Minimum required for dev
DATABASE_URL=postgresql://user:pass@localhost:5432/progresstracker
NEXTAUTH_SECRET=your-secret-min-32-characters
NEXTAUTH_URL=http://localhost:3000
ENCRYPTION_KEY=your-key-min-32-characters
```

```bash
# 4. Set up database
npm run prisma:generate
npm run prisma:migrate:dev

# 5. (Optional) Seed with test data
npm run prisma:seed

# 6. Start development server
npm run dev

# 7. Open http://localhost:3000
```

---

## 🗄️ Database Setup Options

### Option 1: Local PostgreSQL

```bash
# Create database
psql -U postgres
CREATE DATABASE progresstracker;
\q

# Set in .env.local
DATABASE_URL=postgresql://postgres:password@localhost:5432/progresstracker
```

### Option 2: Neon (Recommended - Free Cloud DB)

1. Sign up at [neon.tech](https://neon.tech)
2. Create project → Copy connection string
3. Paste into `DATABASE_URL` in `.env.local`

### Option 3: Supabase

1. Sign up at [supabase.com](https://supabase.com)
2. New project → Settings → Database → Connection string (URI mode)
3. Paste into `DATABASE_URL`

---

## 🔑 Minimum Required Environment Variables

| Variable | Description | Where to Get |
|----------|-------------|-------------|
| `DATABASE_URL` | PostgreSQL connection | Your DB provider |
| `NEXTAUTH_SECRET` | Auth signing secret | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App URL | `http://localhost:3000` |
| `ENCRYPTION_KEY` | Data encryption key | `openssl rand -base64 32` |

For optional features, see [Environment Variables](02-environment-variables.md).

---

## 🏃 Available Dev Scripts

```bash
npm run dev              # Start dev server (port 3000)
npm run prisma:studio    # Open DB browser (port 5555)
npm run prisma:migrate:dev  # Run migrations
npm run prisma:seed      # Seed test data
npm run test             # Run tests
npm run lint             # Run ESLint
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 in use | Run `npx kill-port 3000` or use `npm run dev -- -p 3001` |
| Prisma client not generated | Run `npm run prisma:generate` |
| DB connection fails | Check `DATABASE_URL` format and that DB is running |
| `NEXTAUTH_SECRET` error | Must be at least 32 characters |

---

## 📎 Related Docs

- [Environment Variables](02-environment-variables.md)
- [Database Setup](04-database-setup.md)
