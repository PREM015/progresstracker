# 🤝 Contributing to ProgressTracker

> **Last Updated**: 2026-03-15 | **Version**: 1.0
> **Status**: Active

Thank you for your interest in contributing to ProgressTracker! This guide will help you get started.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Adding a New Platform Integration](#adding-a-new-platform-integration)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)

---

## 📜 Code of Conduct

Please read our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing. We are committed to maintaining an open and welcoming community.

---

## 🚀 Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Set up** the development environment (see below)
4. **Create** a new branch for your changes
5. **Make** your changes
6. **Test** your changes
7. **Submit** a Pull Request

---

## 🛠️ Development Setup

```bash
# 1. Clone your fork
git clone https://github.com/YOUR_USERNAME/progresstracker.git
cd progresstracker

# 2. Add upstream remote
git remote add upstream https://github.com/PREM015/progresstracker.git

# 3. Install dependencies
npm install

# 4. Copy environment file
cp .env.example .env.local
# Fill in the required values

# 5. Set up database
npm run prisma:generate
npm run prisma:migrate:dev

# 6. Seed test data
npm run prisma:seed

# 7. Start development server
npm run dev
```

---

## 🌿 Branch Naming

Use the following conventions:

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/description` | `feature/add-codeforces-sync` |
| Bug Fix | `fix/description` | `fix/streak-calculation-bug` |
| Documentation | `docs/description` | `docs/update-api-reference` |
| Refactor | `refactor/description` | `refactor/sync-service` |
| Hotfix | `hotfix/description` | `hotfix/critical-auth-bug` |
| Release | `release/version` | `release/v2.1.0` |

---

## ✍️ Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code formatting (no logic change) |
| `refactor` | Code refactoring |
| `test` | Adding/updating tests |
| `chore` | Build process, dependency updates |
| `perf` | Performance improvements |

### Examples

```bash
feat(sync): add Codeforces platform scraper
fix(auth): resolve JWT token expiry issue
docs(api): update endpoints reference for v2
test(goals): add unit tests for streak calculation
chore(deps): update next.js to v15.0
```

---

## 🔄 Pull Request Process

### Before Submitting

- [ ] Code follows the project's [coding standards](#coding-standards)
- [ ] All tests pass (`npm run test`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Documentation updated if needed
- [ ] `CHANGELOG.md` updated with your changes

### PR Checklist

When submitting a PR, include:
1. **Clear description** of what the PR does
2. **Issue reference** if applicable (`Fixes #123`)
3. **Screenshots** for UI changes
4. **Test results** showing the feature works

### Review Process

1. Automated checks must pass (CI/CD)
2. At least 1 maintainer review required
3. All review comments must be addressed
4. Squash commits before merging (if requested)

---

## 🔌 Adding a New Platform Integration

To add a new coding platform (e.g., AtCoder, Codechef):

### Step 1: Database Entry

Add the platform to the `Platform` seed data:

```typescript
// prisma/seed.ts
{
  name: "AtCoder",
  slug: "atcoder",
  category: "DSA",
  authType: "SCRAPING",
  baseUrl: "https://atcoder.jp",
  // ...
}
```

### Step 2: Create Scraper

```bash
# Create new scraper file
touch src/services/scrapers/atcoderScraper.ts
```

Implement the `PlatformScraper` interface:

```typescript
import { PlatformScraper, ScrapeResult } from './types';

export class AtCoderScraper implements PlatformScraper {
  async scrape(username: string): Promise<ScrapeResult> {
    // Fetch data from AtCoder
    // Parse and return standardized data
  }
}
```

### Step 3: Register Scraper

Add to the scraper registry:

```typescript
// src/services/syncService.ts
import { AtCoderScraper } from './scrapers/atcoderScraper';

const scrapers = {
  atcoder: new AtCoderScraper(),
  // ...existing scrapers
};
```

### Step 4: Add Tests

```bash
touch src/__tests__/scrapers/atcoderScraper.test.ts
```

### Step 5: Add Documentation

Create `docs/sync/platform-guides/atcoder.md`

---

## 📐 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` type - use proper typing
- Use interfaces over type aliases where possible
- Export types from a central `types/` directory

```typescript
// ✅ Good
interface UserProfile {
  id: string;
  email: string;
  name: string | null;
}

// ❌ Avoid
const user: any = {};
```

### React Components

- Use functional components with hooks
- Use named exports (not default)
- Keep components small and focused

```typescript
// ✅ Good
export function UserCard({ user }: { user: UserProfile }) {
  return <div>{user.name}</div>;
}

// ❌ Avoid
export default function({ user }: any) {
  return <div>{user.name}</div>;
}
```

### API Routes

- Always validate input with Zod
- Return consistent error responses
- Use proper HTTP status codes

```typescript
// ✅ Good
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  const body = await req.json();
  const result = schema.safeParse(body);
  
  if (!result.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }
  // ...
}
```

---

## 🧪 Testing Requirements

### Unit Tests

Required for:
- Utility functions in `src/lib/`
- Service functions in `src/services/`
- Scraper logic

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage
```

### Integration Tests

Required for:
- API route handlers
- Database operations

### E2E Tests

Required for:
- Critical user flows (login, signup)
- Core features (add entry, sync platforms)

```bash
# Run E2E tests
npm run test:e2e
```

### Coverage Targets

| Type | Target |
|------|--------|
| Unit Tests | 80% |
| Integration | 70% |
| E2E | Critical paths |

---

## ❓ Questions?

- 💬 **GitHub Discussions**: For general questions
- 🐛 **GitHub Issues**: For bug reports
- 📧 **Email**: contribute@progresstracker.app

---

> 📝 **Changelog**
> | Date | Change |
> |------|--------|
> | 2026-03-15 | Initial version |
