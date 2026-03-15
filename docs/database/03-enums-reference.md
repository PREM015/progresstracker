# 📚 Enums Reference

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

All enums defined in `prisma/schema.prisma` with descriptions.

---

## 👤 User & Auth Enums

### `Role`
User permission level.
| Value | Description |
|-------|-------------|
| `user` | Regular user (default) |
| `admin` | Administrator with full access |

---

## 🔌 Platform Enums

### `PlatformCategory`
Categories for coding platforms.
| Value | Description |
|-------|-------------|
| `DSA` | Data Structures & Algorithms (LeetCode, Codeforces) |
| `JOB` | Job boards (LinkedIn, Glassdoor) |
| `GIT` | Version control (GitHub, GitLab) |
| `LEARNING` | Learning platforms (Coursera, Udemy) |
| `HACKATHON` | Hackathon sites (DevPost, HackerEarth) |
| `OPENSOURCE` | Open source (GitHub, GSOC) |
| `COMPANY` | Company assessments (HackerRank) |
| `DESIGN` | Design (Dribbble, Behance) |
| `DATA_SCIENCE` | Data science (Kaggle) |
| `OTHER` | Any other platform |

### `AuthType`
How the platform is accessed.
| Value | Description |
|-------|-------------|
| `NONE` | No auth needed (public data) |
| `OAUTH` | OAuth 2.0 flow |
| `API_KEY` | API key provided by user |
| `SCRAPING` | Web scraping (public profile) |
| `MANUAL` | Manual entry only |
| `HYBRID` | Multiple auth methods |

### `SyncStatus`
Status of a platform sync operation.
| Value | Description |
|-------|-------------|
| `IDLE` | Not running |
| `PENDING` | Queued, waiting to start |
| `IN_PROGRESS` | Currently syncing |
| `SUCCESS` | Completed successfully |
| `PARTIAL` | Some data synced, some failed |
| `FAILED` | Sync failed completely |
| `CANCELLED` | Manually cancelled |
| `RATE_LIMITED` | API rate limit hit |

---

## 🔔 Notification Enums

### `NotificationType`
| Value | Description |
|-------|-------------|
| `SYSTEM` | System announcements |
| `ACHIEVEMENT_UNLOCKED` | Badge earned |
| `GOAL_REMINDER` | Goal check-in reminder |
| `GOAL_COMPLETED` | Goal achieved |
| `GOAL_FAILED` | Goal deadline missed |
| `STREAK_AT_RISK` | Streak may break today |
| `STREAK_BROKEN` | Streak ended |
| `STREAK_MILESTONE` | Streak milestone (7, 30, 100 days) |
| `SYNC_COMPLETE` | Platform sync finished |
| `SYNC_FAILED` | Platform sync failed |
| `WEEKLY_REPORT` | Weekly progress email |
| `MONTHLY_REPORT` | Monthly summary |
| `NEW_FEATURE` | Product updates |
| `SECURITY_ALERT` | Login from new device, etc. |
| `BILLING_ALERT` | Payment failed, subscription expiring |
| `WELCOME` | New user welcome |
| `REFERRAL` | Referral reward earned |
| `CUSTOM` | Admin-sent message |

### `NotificationChannel`
| Value | Description |
|-------|-------------|
| `IN_APP` | Dashboard notification bell |
| `EMAIL` | Email via Brevo |
| `PUSH` | Web push notification |
| `SMS` | SMS (future) |

### `NotificationPriority`
| Value | Description |
|-------|-------------|
| `LOW` | Informational |
| `NORMAL` | Standard |
| `HIGH` | Important, shown prominently |
| `URGENT` | Critical (security alerts) |

---

## 🎯 Goals Enums

### `GoalStatus`
| Value | Description |
|-------|-------------|
| `DRAFT` | Not yet activated |
| `ACTIVE` | Currently tracking |
| `PAUSED` | Temporarily paused |
| `COMPLETED` | Target reached |
| `FAILED` | Deadline passed without completion |
| `ARCHIVED` | Old goal, hidden |
| `CANCELLED` | Manually cancelled |

### `GoalType`
| Value | Description |
|-------|-------------|
| `DAILY` | Daily target |
| `WEEKLY` | Weekly target |
| `MONTHLY` | Monthly target |
| `QUARTERLY` | 3-month target |
| `YEARLY` | Annual target |
| `CUSTOM` | Custom date range |
| `STREAK` | Maintain streak for N days |
| `MILESTONE` | One-time milestone |

### `GoalMetric`
What the goal measures.
| Value | Description |
|-------|-------------|
| `PROBLEMS_SOLVED` | LeetCode, etc. |
| `COMMITS` | GitHub commits |
| `PULL_REQUESTS` | GitHub PRs |
| `PROJECTS_COMPLETED` | Projects finished |
| `COURSES_COMPLETED` | Online courses |
| `CERTIFICATIONS` | Certs earned |
| `APPLICATIONS_SUBMITTED` | Job applications |
| `CONTESTS_PARTICIPATED` | Coding contests |
| `TIME_SPENT` | Hours tracked |
| `STREAK_DAYS` | Consecutive days |
| `CUSTOM` | User-defined metric |

---

## 💳 Billing Enums

### `SubscriptionTier`
| Value | Features |
|-------|---------|
| `FREE` | 3 platforms, basic stats |
| `STARTER` | 10 platforms, goals, export |
| `PRO` | Unlimited platforms, analytics, API |
| `TEAM` | Multiple users, team dashboard |
| `ENTERPRISE` | Custom limits, SLA, support |

### `SubscriptionStatus`
| Value | Description |
|-------|-------------|
| `ACTIVE` | Subscription is active |
| `TRIALING` | In trial period |
| `PAST_DUE` | Payment failed |
| `CANCELLED` | Cancelled, access until period end |
| `INCOMPLETE` | Payment setup incomplete |
| `PAUSED` | Subscription paused |

### `BillingInterval`
| Value | Description |
|-------|-------------|
| `MONTHLY` | Billed monthly |
| `YEARLY` | Billed annually (discount) |
| `LIFETIME` | One-time payment |

### `PaymentStatus`
| Value | Description |
|-------|-------------|
| `PENDING` | Awaiting processing |
| `PROCESSING` | Being processed |
| `SUCCEEDED` | Payment successful |
| `FAILED` | Payment failed |
| `CANCELLED` | Cancelled before processing |
| `REFUNDED` | Full refund issued |
| `DISPUTED` | Chargeback filed |

---

## 📤 Export Enums

### `ExportFormat`
| Value | Description |
|-------|-------------|
| `CSV` | Comma-separated values |
| `JSON` | JSON format |
| `PDF` | PDF report |
| `EXCEL` | Excel spreadsheet |
| `XML` | XML format |

### `ExportStatus`
| Value | Description |
|-------|-------------|
| `QUEUED` | Waiting in queue |
| `PENDING` | About to start |
| `PROCESSING` | Generating file |
| `COMPLETED` | Ready to download |
| `FAILED` | Export failed |
| `EXPIRED` | Download link expired |
| `CANCELLED` | Manually cancelled |

---

## 🔒 Security Enums

### `AuditAction`
All tracked user actions.
| Value | Category |
|-------|---------|
| `LOGIN`, `LOGOUT`, `LOGIN_FAILED` | Auth events |
| `PASSWORD_CHANGE`, `PASSWORD_RESET` | Password events |
| `EMAIL_CHANGE` | Account changes |
| `TWO_FACTOR_ENABLE`, `TWO_FACTOR_DISABLE` | 2FA events |
| `EXPORT_DATA`, `IMPORT_DATA` | Data events |
| `SYNC_TRIGGER` | Sync events |
| `SUBSCRIPTION_CHANGE` | Billing events |
| `API_KEY_CREATE`, `API_KEY_DELETE` | API key events |
| `ACCOUNT_DELETE` | Account deletion |
| `ADMIN_ACTION` | Admin operations |
| `WEBHOOK_TRIGGER` | Webhook delivery |
| `SHARE_CREATE`, `SHARE_ACCESS` | Share link events |

---

## 📎 Related Docs

- [Schema Overview](01-schema-overview.md)
- [Relationships](02-relationships.md)
