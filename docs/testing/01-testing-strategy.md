# 🧪 Testing Strategy

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Testing Philosophy

We use a **testing pyramid** approach:
- Many fast unit tests at the bottom
- Fewer integration tests in the middle
- Select E2E tests for critical user flows at the top

---

## 🏗️ Testing Stack

| Type | Tool | Config |
|------|------|--------|
| Unit Tests | Jest + ts-jest | `jest.config.js` |
| Integration Tests | Jest + Prisma | With test database |
| E2E Tests | Playwright | `playwright.config.ts` |
| Coverage | Jest Coverage | 80% target |

---

## 📊 Coverage Targets

| Category | Target |
|----------|--------|
| Overall | 80% |
| Utilities (`src/lib/`) | 90% |
| Services (`src/services/`) | 85% |
| API Routes | 70% |
| Components | 60% |

---

## 🚀 Running Tests

```bash
# Unit tests
npm run test

# Watch mode (TDD)
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e

# Run specific test file
npm test -- goalService.test.ts

# Run tests matching name
npm test -- --testNamePattern="streak"
```

---

## 📁 Test File Locations

```
src/
├── __tests__/
│   ├── unit/
│   │   ├── lib/
│   │   │   ├── crypto.test.ts
│   │   │   └── totp.test.ts
│   │   └── services/
│   │       ├── streakService.test.ts
│   │       └── goalService.test.ts
│   └── integration/
│       └── api/
│           ├── tracker.test.ts
│           └── goals.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── dashboard.spec.ts
    └── goals.spec.ts
```

---

## 🔧 Test Environment

```env
# .env.test
DATABASE_URL=postgresql://user:pass@localhost:5432/progresstracker_test
NEXTAUTH_SECRET=test-secret-min-32-characters-long
ENCRYPTION_KEY=test-encryption-key-min-32-chars
```

---

## 📎 Related Docs

- [Unit Tests](02-unit-tests.md)
- [Integration Tests](03-integration-tests.md)
- [E2E Tests](04-e2e-tests.md)
- [Test Data Seeding](05-test-data-seeding.md)
