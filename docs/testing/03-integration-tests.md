# 🔗 Integration Tests Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 What to Integration Test

Integration tests verify that **API routes + database** work correctly together.

**Test these with integration tests:**
- API route handlers
- Database operations (CRUD)
- Auth middleware behavior
- Validation error responses

---

## 🛠️ Setup

```typescript
// jest.setup.ts
import { prisma } from '@/lib/database';

beforeEach(async () => {
  // Clean database before each test
  await prisma.trackerEntry.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

---

## 📝 Example: API Route Test

```typescript
// src/__tests__/integration/api/tracker.test.ts
import { POST } from '@/app/api/tracker/route';
import { prisma } from '@/lib/database';

describe('POST /api/tracker', () => {
  it('should create a tracker entry for authenticated user', async () => {
    // Create test user
    const user = await prisma.user.create({
      data: { email: 'test@test.com', isVerified: true }
    });
    
    // Create mock request
    const req = new Request('http://localhost:3000/api/tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'DSA',
        problemsSolved: 5,
        date: '2026-03-15',
      }),
    });
    
    // Mock auth session
    jest.spyOn(getServerSession, '').mockResolvedValue({ user: { id: user.id } });
    
    const response = await POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.data.problemsSolved).toBe(5);
    
    // Verify database
    const entry = await prisma.trackerEntry.findFirst({ where: { userId: user.id } });
    expect(entry).toBeTruthy();
    expect(entry?.problemsSolved).toBe(5);
  });

  it('should return 401 for unauthenticated request', async () => {
    const req = new Request('http://localhost:3000/api/tracker', {
      method: 'POST',
      body: JSON.stringify({ category: 'DSA' }),
    });
    
    const response = await POST(req);
    expect(response.status).toBe(401);
  });
});
```

---

## ▶️ Running Integration Tests

```bash
# Set test database
export DATABASE_URL=postgresql://user:pass@localhost:5432/progresstracker_test

# Run integration tests
npm test -- --testPathPattern=integration
```

---

## 📎 Related Docs

- [Testing Strategy](01-testing-strategy.md)
- [E2E Tests](04-e2e-tests.md)
