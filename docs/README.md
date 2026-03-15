# 📚 ProgressTracker Documentation

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

Welcome to the complete documentation for **ProgressTracker** - the platform to track your programming journey across 50+ platforms.

---

## 🗂️ Documentation Index

### 🏗️ Architecture
| File | Description |
|------|-------------|
| [01-system-overview.md](architecture/01-system-overview.md) | High-level architecture and system components |
| [02-tech-stack.md](architecture/02-tech-stack.md) | Technology choices and rationale |
| [03-folder-structure.md](architecture/03-folder-structure.md) | Codebase organization explained |
| [04-design-decisions.md](architecture/04-design-decisions.md) | Architecture Decision Records (ADRs) |

### 🗄️ Database
| File | Description |
|------|-------------|
| [01-schema-overview.md](database/01-schema-overview.md) | All Prisma models and ER diagram |
| [02-relationships.md](database/02-relationships.md) | Model relationships deep dive |
| [03-enums-reference.md](database/03-enums-reference.md) | All enums and their values |
| [04-indexes-optimization.md](database/04-indexes-optimization.md) | Index strategy and query optimization |
| [05-migrations-guide.md](database/05-migrations-guide.md) | Running and writing migrations |

### 🔌 API
| File | Description |
|------|-------------|
| [01-api-overview.md](api/01-api-overview.md) | API structure, auth, and conventions |
| [02-endpoints-reference.md](api/02-endpoints-reference.md) | Complete endpoint reference |
| [03-error-codes.md](api/03-error-codes.md) | Error codes and handling |
| [04-rate-limiting.md](api/04-rate-limiting.md) | Rate limiting rules and headers |

### 🔐 Authentication
| File | Description |
|------|-------------|
| [01-authentication-flow.md](auth/01-authentication-flow.md) | Login, Register, OAuth flows |
| [02-session-management.md](auth/02-session-management.md) | Sessions and refresh tokens |
| [03-two-factor-auth.md](auth/03-two-factor-auth.md) | 2FA setup and verification |

### 🌟 Features
| File | Description |
|------|-------------|
| [01-core-features-overview.md](features/01-core-features-overview.md) | All features summary |
| [02-goals-system.md](features/02-goals-system.md) | Goals and milestones |
| [03-streak-system.md](features/03-streak-system.md) | Streak calculation logic |
| [04-achievements-gamification.md](features/04-achievements-gamification.md) | Achievements and badges |
| [05-notifications.md](features/05-notifications.md) | Notification channels and types |
| [06-export-system.md](features/06-export-system.md) | Data export (CSV, JSON, PDF) |
| [07-share-embed.md](features/07-share-embed.md) | Public profile sharing |
| [08-leaderboard.md](features/08-leaderboard.md) | Leaderboard system |
| [09-referral-system.md](features/09-referral-system.md) | Referral rewards |

### 🔄 Sync Engine
| File | Description |
|------|-------------|
| [01-sync-architecture.md](sync/01-sync-architecture.md) | Core sync engine architecture |
| [02-platform-scrapers.md](sync/02-platform-scrapers.md) | Scraper design and implementation |
| [03-webhook-handlers.md](sync/03-webhook-handlers.md) | Webhook processing |
| [04-sync-troubleshooting.md](sync/04-sync-troubleshooting.md) | Fixing sync issues |
| [platform-guides/github.md](sync/platform-guides/github.md) | GitHub sync setup |
| [platform-guides/leetcode.md](sync/platform-guides/leetcode.md) | LeetCode sync setup |
| [platform-guides/codeforces.md](sync/platform-guides/codeforces.md) | Codeforces sync setup |
| [platform-guides/hackerrank.md](sync/platform-guides/hackerrank.md) | HackerRank sync setup |

### 💳 Billing
| File | Description |
|------|-------------|
| [01-stripe-integration.md](billing/01-stripe-integration.md) | Stripe payment setup |
| [02-subscription-tiers.md](billing/02-subscription-tiers.md) | Plan features and limits |
| [03-payment-flows.md](billing/03-payment-flows.md) | Payment and refund flows |

### 🎨 Frontend
| File | Description |
|------|-------------|
| [01-component-architecture.md](frontend/01-component-architecture.md) | Component structure |
| [02-state-management.md](frontend/02-state-management.md) | Zustand and React Query |
| [03-styling-guide.md](frontend/03-styling-guide.md) | Tailwind CSS conventions |

### 🚀 Deployment
| File | Description |
|------|-------------|
| [01-local-setup.md](deployment/01-local-setup.md) | Local development setup |
| [02-environment-variables.md](deployment/02-environment-variables.md) | All env vars explained |
| [03-vercel-deployment.md](deployment/03-vercel-deployment.md) | Deploy to Vercel |
| [04-database-setup.md](deployment/04-database-setup.md) | PostgreSQL setup |
| [05-monitoring-setup.md](deployment/05-monitoring-setup.md) | Sentry and monitoring |

### 🧪 Testing
| File | Description |
|------|-------------|
| [01-testing-strategy.md](testing/01-testing-strategy.md) | Testing approach and tools |
| [02-unit-tests.md](testing/02-unit-tests.md) | Writing unit tests |
| [03-integration-tests.md](testing/03-integration-tests.md) | Integration test guide |
| [04-e2e-tests.md](testing/04-e2e-tests.md) | Playwright E2E tests |
| [05-test-data-seeding.md](testing/05-test-data-seeding.md) | Test data setup |

### 🔒 Security
| File | Description |
|------|-------------|
| [01-security-overview.md](security/01-security-overview.md) | Security practices overview |
| [02-data-protection.md](security/02-data-protection.md) | Data protection measures |
| [03-audit-logging.md](security/03-audit-logging.md) | Audit log system |

### ⚡ Performance
| File | Description |
|------|-------------|
| [01-optimization-guide.md](performance/01-optimization-guide.md) | Performance tips |
| [02-caching-strategy.md](performance/02-caching-strategy.md) | Redis caching strategy |
| [03-load-testing.md](performance/03-load-testing.md) | Load testing guide |

### 📊 Diagrams
| File | Description |
|------|-------------|
| [system-architecture.mmd](diagrams/system-architecture.mmd) | System architecture diagram |
| [database-erd.mmd](diagrams/database-erd.mmd) | Entity relationship diagram |
| [auth-flow.mmd](diagrams/auth-flow.mmd) | Auth flow diagram |
| [sync-flow.mmd](diagrams/sync-flow.mmd) | Sync engine flow |
| [billing-flow.mmd](diagrams/billing-flow.mmd) | Billing flow |
| [deployment-architecture.mmd](diagrams/deployment-architecture.mmd) | Deployment architecture |

### 📖 Guides
| File | Description |
|------|-------------|
| [troubleshooting.md](guides/troubleshooting.md) | Common issues and solutions |
| [migration-guide.md](guides/migration-guide.md) | Version upgrade guide |
| [roadmap.md](guides/roadmap.md) | Future features planned |
| [analytics.md](guides/analytics.md) | Analytics integration |
| [integrations.md](guides/integrations.md) | Third-party integrations |

### 🛠️ Developer Tools
| File | Description |
|------|-------------|
| [vscode-config.md](developer-tools/vscode-config.md) | VS Code setup |
| [debug-guide.md](developer-tools/debug-guide.md) | Debugging tips |
| [docker-setup.md](developer-tools/docker-setup.md) | Docker dev environment |

### 📋 Cheatsheets
| File | Description |
|------|-------------|
| [prisma-commands.md](cheatsheets/prisma-commands.md) | Prisma CLI reference |
| [npm-scripts.md](cheatsheets/npm-scripts.md) | All npm scripts |
| [git-workflow.md](cheatsheets/git-workflow.md) | Git conventions |

### 🎨 Design System
| File | Description |
|------|-------------|
| [colors-typography.md](design-system/colors-typography.md) | Colors and fonts |
| [components-library.md](design-system/components-library.md) | UI components |
| [accessibility.md](design-system/accessibility.md) | A11y guidelines |

---

## 🔗 Quick Links

- **[Back to Project README](../README.md)**
- **[GitHub Issues](https://github.com/PREM015/progresstracker/issues)**
- **[Contributing Guide](../CONTRIBUTING.md)**
- **[Changelog](../CHANGELOG.md)**
