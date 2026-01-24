# 🚀 Local Setup Guide - Progress Tracker

Complete step-by-step guide to set up Progress Tracker on your local machine for development.

**Estimated Time:** 15-20 minutes  
**Last Updated:** January 25, 2026

---

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js:** v18.x or higher (check with `node --version`)
- **npm:** v9.x or higher (check with `npm --version`)
- **Git:** Latest version (check with `git --version`)
- **Docker & Docker Compose:** For running PostgreSQL locally (optional but recommended)
- **PostgreSQL:** v14+ (if not using Docker)
- **Redis:** Optional (Upstash provides cloud Redis for development)
- **GitHub Account:** For OAuth setup (optional for basic development)
- **Text Editor:** VS Code recommended

---

## ⚡ Quick Start (5 minutes)

For experienced developers:

```bash
# Clone the repository
git clone https://github.com/PREM015/progresstracker.git
cd progresstracker

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials
nano .env.local  # or use your preferred editor

# Install dependencies
npm install

# Set up database
npm run prisma:generate
npm run prisma:migrate:dev

# Seed test data (optional)
npm run seed:test

# Start development server
npm run dev

# Open http://localhost:3000 in your browser
```

Done! Skip to **Testing Your Setup** if this worked.

---

## 📚 Detailed Setup Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/PREM015/progresstracker.git
cd progresstracker
```

**What this does:** Downloads the project code to your computer.

### Step 2: Copy Environment Variables Template

```bash
cp .env.example .env.local
```

This creates `.env.local` with all required environment variables. You'll edit this next.

### Step 3: Configure Environment Variables

Edit `.env.local`:

```bash
nano .env.local  # or use: code .env.local (VS Code)
```

**Required Variables (minimum to run):**

```env
# Local development (localhost)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key-at-least-32-characters-long

# Encryption key (must be different from NEXTAUTH_SECRET)
ENCRYPTION_KEY=dev-encryption-key-at-least-32-chars-long

# Database URL (see Step 4 for setup)
DATABASE_URL=postgresql://postgres:password@localhost:5432/progresstracker

# Basic OAuth (optional for local development)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Other services
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

**How to generate NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
# Output: jH8kL9pQ2wX7vM3nB5dF1gT4sR6uY9cZ...
# Copy this value to NEXTAUTH_SECRET
```

### Step 4: Set Up PostgreSQL Database

**Option A: Using Docker (Recommended)**

```bash
# Create docker-compose.yml in project root if it doesn't exist
docker-compose up -d

# Verify it's running
docker ps
```

Docker will start PostgreSQL on localhost:5432 with:
- Username: postgres
- Password: postgres  
- Database: progresstracker

**Option B: Local PostgreSQL Installation**

```bash
# macOS (using Homebrew)
brew install postgresql@14
brew services start postgresql@14
createdb progresstracker

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql-14
sudo systemctl start postgresql
createdb progresstracker

# Windows
# Download from https://www.postgresql.org/download/windows/
# Run installer and remember your password
# Open pgAdmin 4 to create database "progresstracker"
```

**Verify connection:**

```bash
psql -U postgres -h localhost -d progresstracker
# If successful, you'll see: progresstracker=#
# Type: \q to exit
```

### Step 5: Set Up Redis (Optional)

For local development, use Upstash (cloud Redis):

1. Go to https://upstash.com
2. Sign up for free account
3. Create Redis database
4. Copy REST URL and token to `.env.local`:

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

**Or use local Redis:**

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis-server

# Test connection
redis-cli ping
# Output: PONG
```

### Step 6: Install Node Dependencies

```bash
npm install

# This installs all packages from package.json
# Takes 2-3 minutes
```

### Step 7: Initialize Database Schema

```bash
# Generate Prisma client
npm run prisma:generate

# Create database tables (run migrations)
npm run prisma:migrate:dev

# When prompted for migration name, type: "initial"
```

You'll see:

```
✔ Enter a name for this migration › initial
Applying migration `20240125_initial`

Generated Prisma Client ...
✔ Generated Prisma Client to ./src/generated/prisma

Done in 2.5s.
```

### Step 8 (Optional): Seed Test Data

Populate database with sample data for testing:

```bash
npm run seed:test

# Output should show:
# ✓ Created 5 test users
# ✓ Created 10 platforms
# ✓ Created 50 tracker entries
```

### Step 9: Start Development Server

```bash
npm run dev

# Output:
# ▲ Next.js 14.0.0
# - Local: http://localhost:3000
# Ready in 2.5s
```

### Step 10: Verify Setup

1. Open http://localhost:3000 in your browser
2. You should see the Progress Tracker landing page
3. Click "Sign In"
4. You can use credentials-based login or OAuth (if configured)

**For testing without OAuth:**
- Email: test@example.com  
- Password: TestPassword123!

(Only if you seeded test data in Step 8)

---

## 🔧 Setting Up OAuth (Optional for Development)

OAuth allows users to sign in with GitHub or Google.

### GitHub OAuth Setup

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** Progress Tracker Dev
   - **Homepage URL:** http://localhost:3000
   - **Authorization callback URL:** http://localhost:3000/api/auth/callback/github
4. Copy and paste in `.env.local`:
   ```env
   GITHUB_CLIENT_ID=<your-client-id>
   GITHUB_CLIENT_SECRET=<your-client-secret>
   ```

### Google OAuth Setup

1. Go to https://console.cloud.google.com
2. Create new project: "Progress Tracker Dev"
3. Go to "APIs & Services" → "Credentials"
4. Create "OAuth 2.0 Client ID"
5. Add redirect URI: http://localhost:3000/api/auth/callback/google
6. Copy credentials to `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=<your-client-id>
   GOOGLE_CLIENT_SECRET=<your-client-secret>
   ```

---

## 🧪 Testing Your Setup

Run these commands to verify everything works:

```bash
# Check TypeScript compilation
npm run typecheck

# Run linter
npm run lint

# Run tests
npm run test

# Run E2E tests (requires setup)
npm run test:e2e

# Check coverage
npm run test:coverage
```

All should pass without errors.

---

## ❌ Troubleshooting

### "npm ERR! code ENOENT" when running npm install

**Problem:** npm can't find some packages

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete lock file
rm -f package-lock.json

# Reinstall
npm install
```

### "Cannot connect to database"

**Problem:** PostgreSQL not running or connection string is wrong

**Solutions:**

1. **Check if PostgreSQL is running:**
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Linux  
   sudo systemctl status postgresql
   ```

2. **Verify DATABASE_URL in `.env.local`**
   ```env
   # For local PostgreSQL running on default port 5432:
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/progresstracker
   ```

3. **Try connecting directly:**
   ```bash
   psql -U postgres -h localhost -d progresstracker
   ```

### "Port 3000 already in use"

**Problem:** Something else is using port 3000

**Solutions:**

1. **Kill the process using port 3000:**
   ```bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   
   # Windows (PowerShell)
   Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
   ```

2. **Use a different port:**
   ```bash
   npm run dev -- -p 3001
   # Now access http://localhost:3001
   ```

### "NEXTAUTH_SECRET not set"

**Problem:** Missing or invalid NEXTAUTH_SECRET in `.env.local`

**Solution:**
```bash
# Generate a new secret
openssl rand -base64 32

# Add to .env.local
echo "NEXTAUTH_SECRET=<paste-the-output>" >> .env.local
```

### TypeScript compilation errors

**Problem:** `npm run typecheck` shows errors

**Solutions:**
```bash
# Regenerate Prisma client
npm run prisma:generate

# Check tsconfig.json is valid
npm run typecheck -- --noEmit

# Clear Next.js cache
rm -rf .next
npm run dev
```

### "Migration failed" error

**Problem:** Database migration didn't apply correctly

**Solutions:**
```bash
# Reset database (WARNING: deletes all data!)
npm run prisma:migrate:reset

# Check migration status
npm run prisma:migrate:status

# Manually run pending migrations
npm run prisma:migrate:deploy
```

### Prisma Studio not working

**Problem:** Can't view/edit database in Prisma Studio

**Solution:**
```bash
# Open Prisma Studio
npm run prisma:studio

# Should open http://localhost:5555
# If not, manually open that URL in browser
```

### "Invalid ENCRYPTION_KEY"

**Problem:** Encryption key format is wrong

**Solution:**
```bash
# Generate a valid key
openssl rand -base64 32

# Update .env.local
ENCRYPTION_KEY=<your-generated-key>
```

---

## 📁 Project Structure After Setup

```
progresstracker/
├── .env.local                 # Your local config (don't commit!)
├── .env.example              # Template (commit this)
├── node_modules/             # Dependencies
├── .next/                    # Next.js build cache
├── src/
│   ├── app/                  # Next.js app directory
│   ├── components/           # React components
│   ├── lib/                  # Utility functions
│   ├── services/             # Business logic
│   ├── hooks/                # Custom React hooks
│   ├── types/                # TypeScript types
│   └── trigger/              # Background jobs
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── public/                   # Static files
├── tests/                    # Test files
└── docs/                     # Documentation
```

---

## 🎯 Next Steps

After setup:

1. **Read Architecture:** See [docs/ARCHITECTURE.md](ARCHITECTURE.md)
2. **API Reference:** See [docs/API_REFERENCE.md](API_REFERENCE.md)
3. **Contributing:** See [docs/CONTRIBUTING.md](CONTRIBUTING.md)
4. **Start Coding:** Check out [src/app](../src/app) and [src/components](../src/components)

---

## 📞 Need Help?

- **Documentation:** See [docs/](.) folder
- **Issues:** Check [GitHub Issues](https://github.com/PREM015/progresstracker/issues)
- **Troubleshooting:** See [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## ✅ Setup Verification Checklist

Before you start development:

- [ ] Node.js v18+ installed
- [ ] PostgreSQL running (local or Docker)
- [ ] `.env.local` created with all required variables
- [ ] `npm install` completed successfully
- [ ] `npm run prisma:migrate:dev` completed without errors
- [ ] `npm run dev` starts server without errors
- [ ] http://localhost:3000 loads in browser
- [ ] Can navigate to login page
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes (if tests exist)

**All checked?** You're ready to start development! 🎉

---

**Happy Coding!** 🚀
