# 🎭 E2E Tests (Playwright)

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 What to E2E Test

E2E tests verify **critical user journeys** through the real browser.

**Critical paths to test:**
- User registration and email verification
- Login (email, GitHub OAuth)
- Creating a tracker entry
- Connecting a platform and syncing
- Creating and completing a goal

---

## 🛠️ Playwright Setup

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:3000',
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

---

## 📝 Example: Auth Flow Test

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can register and login', async ({ page }) => {
    // Navigate to register
    await page.goto('/register');
    
    // Fill form
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'SecurePass123!');
    await page.fill('[data-testid="name"]', 'Test User');
    await page.click('[data-testid="register-btn"]');
    
    // Should show verification message
    await expect(page.locator('[data-testid="verify-email-message"]')).toBeVisible();
  });

  test('user can login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'existing@example.com');
    await page.fill('[data-testid="password"]', 'ValidPass123!');
    await page.click('[data-testid="login-btn"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="dashboard-heading"]')).toBeVisible();
  });
});
```

---

## ▶️ Running E2E Tests

```bash
# Install browsers (first time)
npx playwright install

# Run E2E tests (app must be running)
npm run test:e2e

# Run with UI mode
npx playwright test --ui

# Run specific test
npx playwright test e2e/auth.spec.ts
```

---

## 📎 Related Docs

- [Testing Strategy](01-testing-strategy.md)
- [Test Data Seeding](05-test-data-seeding.md)
