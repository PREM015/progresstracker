# 📦 NPM Scripts Cheatsheet

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🚀 Development & Start

| Command | Purpose |
|---------|---------|
| `npm run dev` | Starts the Next.js development server on `localhost:3000` |
| `npm run build` | Creates an optimized production build |
| `npm run start` | Starts the production server (must run build first) |

---

## 🗄️ Database (Prisma)

| Command | Purpose |
|---------|---------|
| `npm run prisma:generate` | Updates the Prisma Client based on schema |
| `npm run prisma:migrate:dev` | Creates and runs a database migration locally |
| `npm run prisma:migrate` | Runs pending migrations (for prod) |
| `npm run prisma:studio` | Opens Prisma GUI to browse/edit data |
| `npm run prisma:seed` | Populates DB with initial test data |

---

## 🧪 Testing

| Command | Purpose |
|---------|---------|
| `npm run test` | Runs Jest unit and integration tests |
| `npm run test:watch` | Runs Jest in interactive watch mode |
| `npm run test:coverage` | Generates a code coverage report |
| `npm run test:e2e` | Runs Playwright End-to-End tests |

---

## 🧹 Code Quality

| Command | Purpose |
|---------|---------|
| `npm run lint` | Runs ESLint to find problems |
| `npm run lint:fix` | Automatically fixes ESLint errors where possible |
| `npm run type-check` | Runs `tsc` to find TypeScript type errors without building |
| `npm run format` | Formats all files with Prettier |

---

## 📎 Related Docs
- [Testing Strategy](../testing/01-testing-strategy.md)
- [Local Setup](../deployment/01-local-setup.md)
