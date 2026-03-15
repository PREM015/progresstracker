# 🧪 Unit Tests Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 What to Unit Test

Unit tests verify **isolated functions** without external dependencies (DB, network, etc.).

**Test these with unit tests:**
- `src/lib/` utilities (crypto, totp, utils)
- `src/services/` business logic (with mocked dependencies)
- Pure calculation functions (streak logic, goal progress)

---

## 📝 Writing Unit Tests

### Test Structure (AAA Pattern)

```typescript
// src/__tests__/unit/services/streakService.test.ts

describe('streakService', () => {
  describe('calculateStreak', () => {
    it('should return 1 for first activity', () => {
      // Arrange
      const lastActivity = null;
      const today = new Date('2026-03-15');
      
      // Act
      const result = calculateStreakIncrement(lastActivity, today);
      
      // Assert
      expect(result).toBe(1);
    });

    it('should increment streak for consecutive days', () => {
      const yesterday = new Date('2026-03-14');
      const today = new Date('2026-03-15');
      
      const result = calculateStreakIncrement(yesterday, today);
      
      expect(result).toBe(1); // increment by 1
    });

    it('should reset streak for missed day', () => {
      const twoDaysAgo = new Date('2026-03-13');
      const today = new Date('2026-03-15');
      
      const result = shouldResetStreak(twoDaysAgo, today);
      
      expect(result).toBe(true);
    });
  });
});
```

### Mocking Dependencies

```typescript
// Mock Prisma
jest.mock('@/lib/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    }
  }
}));

// Use mock in test
import { prisma } from '@/lib/database';

(prisma.user.findUnique as jest.Mock).mockResolvedValue({
  id: 'user1',
  currentStreak: 5,
  lastActivityDate: new Date('2026-03-14'),
});
```

---

## ⚡ Running Unit Tests

```bash
npm test                              # All unit tests
npm test -- --coverage               # With coverage
npm test -- streakService            # Specific file
npm test -- --watch                  # Watch mode
```

---

## 📎 Related Docs

- [Testing Strategy](01-testing-strategy.md)
- [Integration Tests](03-integration-tests.md)
