<div align="center">
  <img src="public/logo.png" alt="ProgressTracker Logo" width="120" />
  <h1>🚀 ProgressTracker</h1>
  <p><strong>The ultimate developer progress tracking platform.</strong></p>
  <p>Monitor activity across 50+ coding platforms, set goals, build streaks, and share your journey.</p>

  <p>
    <a href="https://progresstracker.app"><img src="https://img.shields.io/badge/Status-Live-success.svg" alt="Status"></a>
    <a href="https://github.com/PREM015/progresstracker/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License"></a>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-14-black.svg?logo=next.js" alt="Next.js"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0-blue.svg?logo=typescript" alt="TypeScript"></a>
  </p>
</div>

---

## ✨ Features

- **🔄 Universal Sync**: Automatically pull data from GitHub, LeetCode, HackerRank, Codeforces, and 45+ other platforms.
- **🔥 Heatmap Dashboard**: A beautiful, GitHub-style 365-day activity heatmap to visualize your daily coding streaks.
- **🎯 Smart Goals**: Set daily, weekly, or specific milestone goals and get automated email reminders when you fall behind.
- **🏆 Gamification**: Earn 50+ unique achievements and badges for hitting personal milestones.
- **📊 Detailed Analytics**: Dive deep into your platform breakdown, accuracy, time spent, and historical trends.
- **🔗 Shareable Profile**: Generate a public profile link to share your coding resume with recruiters or friends.

## 🛠️ Tech Stack

Built with the modern web ecosystem for maximum performance and developer experience:

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (hosted on Neon)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Caching & Rate Limiting**: [Upstash Redis](https://upstash.com/)
- **Auth**: [NextAuth.js v4](https://next-auth.js.org/) + custom TOTP Two-Factor Auth
- **Emails**: [Brevo](https://www.brevo.com/)
- **Payments**: [Stripe](https://stripe.com/)
- **Background Jobs**: [Trigger.dev](https://trigger.dev/)

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/PREM015/progresstracker.git
cd progresstracker
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
Fill in the highly required variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`).

### 3. Database Setup
```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 Documentation

We have comprehensive documentation covering every aspect of the project.

**👉 Start here: [Documentation Home (docs/README.md)](docs/README.md)**

### Key Sections:
- 🏗️ **[Architecture Overview](docs/architecture/01-system-overview.md)**
- 🗄️ **[Database Schema](docs/database/01-schema-overview.md)**
- 🔌 **[API Reference](docs/api/01-api-overview.md)**
- 🔐 **[Authentication Flow](docs/auth/01-authentication-flow.md)**
- 🔄 **[Sync Architecture](docs/sync/01-sync-architecture.md)**
- 💳 **[Billing & Stripe](docs/billing/01-stripe-integration.md)**

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) to get started.
- Reporting Bugs? Use our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)
- Requesting Features? Use our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)

## 🛡️ Security

If you discover a security vulnerability, please review our [Security Policy](SECURITY.md) for reporting guidelines. Do not open public issues for security vulnerabilities.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
<div align="center">
  <sub>Built with ❤️ by PREM015 and the ProgressTracker Contributors.</sub>
</div>
