# 📊 Progress Tracker

> Track your programming journey. Monitor progress across 50+ platforms. Celebrate achievements.

![Status](https://img.shields.io/badge/Status-Beta-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Node Version](https://img.shields.io/badge/Node-18.x+-green)

---

## 🚀 Features

### Track Everything
- **Manual Tracking:** Log problems solved, time spent, projects completed
- **Auto-Sync:** Seamlessly connect LeetCode, HackerRank, CodeSignal, and 50+ more platforms
- **Real-time Stats:** See your progress updated instantly across all platforms

### Beautiful Dashboards
- **Activity Heatmap:** Visualize your coding streaks (GitHub style)
- **Trend Charts:** Monthly progress analysis and insights
- **Goals & Milestones:** Set targets and track achievement
- **Performance Metrics:** Problems solved, time invested, achievements earned

### Smart Features
- **Weekly Summaries:** Email reports of your weekly progress
- **Daily Reminders:** Never skip a day with smart notifications
- **Data Export:** Download your progress as CSV or JSON
- **Dark Mode:** Eye-friendly interface for night coding

### Integrations
- **GitHub:** Auto-import commits and contributions
- **Google:** OAuth login and calendar integration
- **LeetCode:** Sync problems and contest ratings
- **HackerRank:** Import solutions and badges
- **CodeSignal:** Track assessment progress
- **...and 45+ more platforms!**

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **SWR** - Data fetching and caching
- **Recharts** - Data visualization

### Backend & Database
- **Next.js API Routes** - Serverless backend
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Reliable relational database
- **Redis** - Caching and rate limiting (Upstash)

### DevOps & Services
- **Vercel** - Deployment and hosting
- **GitHub Actions** - CI/CD pipeline
- **Sentry** - Error tracking and monitoring
- **Trigger.dev** - Background job scheduling
- **AWS S3** - File storage for exports

---

## ⚡ Quick Start

### Prerequisites
- **Node.js:** v18.x or higher
- **npm:** v9.x or higher
- **Git:** Latest version
- **PostgreSQL:** v14+ (local or cloud)

### 5-Minute Setup

```bash
# 1. Clone repository
git clone https://github.com/PREM015/progresstracker.git
cd progresstracker

# 2. Copy environment template
cp .env.example .env.local

# 3. Edit .env.local with your credentials
# Add DATABASE_URL, NEXTAUTH_SECRET, OAuth credentials, etc.
nano .env.local

# 4. Install dependencies
npm install

# 5. Set up database
npm run prisma:generate
npm run prisma:migrate:dev

# 6. Start development server
npm run dev

# 7. Open http://localhost:3000 in your browser
```

**For detailed setup instructions, see [docs/SETUP.md](docs/SETUP.md)**

---

## 📚 Documentation

- **[Setup Guide](docs/SETUP.md)** - Local development setup
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment (Vercel, Azure, Docker)
- **[API Reference](docs/API_REFERENCE.md)** - Complete API documentation
- **[Architecture](docs/ARCHITECTURE.md)** - System design and data flow
- **[Contributing](docs/CONTRIBUTING.md)** - How to contribute
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Changelog](docs/CHANGELOG.md)** - Version history

---

## 📁 Project Structure

```
progresstracker/
├── src/
│   ├── app/                    # Next.js pages and API routes
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Dashboard pages
│   │   ├── api/               # Backend API endpoints
│   │   └── page.tsx           # Landing page
│   ├── components/            # React components
│   │   ├── auth/              # Login/signup components
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── shared/            # Reusable components
│   │   └── ui/                # UI building blocks
│   ├── lib/                   # Utility functions
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── database.ts        # Prisma setup
│   │   ├── crypto.ts          # Encryption utilities
│   │   └── ...
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # Business logic
│   │   ├── authService.ts
│   │   ├── syncService.ts
│   │   ├── statsService.ts
│   │   └── ...
│   ├── types/                 # TypeScript type definitions
│   └── trigger/               # Background jobs
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── docs/                      # Documentation
├── tests/                     # Test files
├── public/                    # Static assets
└── package.json               # Dependencies
```

---

## 🔐 Environment Variables

Create `.env.local` file with these variables:

```env
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-min-32-chars

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/progresstracker

# OAuth Providers
GITHUB_CLIENT_ID=your-id
GITHUB_CLIENT_SECRET=your-secret
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret

# Encryption
ENCRYPTION_KEY=your-key-min-32-chars

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-url
UPSTASH_REDIS_REST_TOKEN=your-token

# See .env.example for complete list
```

See [.env.example](.env.example) for all available variables.

---

## 🚀 Available Scripts

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)

# Building & Production
npm run build            # Build for production
npm start                # Start production server
npm run build:analyze    # Analyze bundle size

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed test data
npm run prisma:studio    # Open Prisma Studio

# Testing
npm run test             # Run unit tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run test:e2e        # E2E tests (Playwright)

# Code Quality
npm run lint            # ESLint check
npm run type-check      # TypeScript check
npm run format          # Format code with Prettier

# Database
npm run db:push         # Push schema to database
npm run db:drop         # Drop all tables (dangerous!)
```

---

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### End-to-End Tests
```bash
npm run test:e2e
```

### Coverage Report
```bash
npm run test:coverage
```

Target: **80% code coverage**

---

## 🌐 API Endpoints

All API endpoints require authentication (except `/api/auth/...`).

### Core Endpoints

| Method | Path | Description |
|--------|------|-------------|
| **GET** | `/api/tracker` | Get tracker entries |
| **POST** | `/api/tracker` | Create entry |
| **PUT** | `/api/tracker/:id` | Update entry |
| **DELETE** | `/api/tracker/:id` | Delete entry |
| **GET** | `/api/platforms` | Get all platforms |
| **GET** | `/api/platforms/connected` | Get user's platforms |
| **POST** | `/api/platforms/:id/connect` | Connect platform |
| **POST** | `/api/sync` | Sync all platforms |
| **GET** | `/api/stats` | Get user statistics |
| **GET** | `/api/stats/monthly` | Get monthly trends |
| **GET** | `/api/stats/heatmap` | Get activity heatmap |
| **GET** | `/api/goals` | Get goals |
| **POST** | `/api/goals` | Create goal |
| **PUT** | `/api/goals/:id` | Update goal |
| **DELETE** | `/api/goals/:id` | Delete goal |

See [API_REFERENCE.md](docs/API_REFERENCE.md) for complete documentation.

---

## 📊 Database Schema

12 main tables:

- **Users** - User accounts and profiles
- **UserPlatforms** - Connected platform accounts
- **Platforms** - Supported platforms (LeetCode, GitHub, etc.)
- **TrackerEntries** - Daily progress logs
- **Goals** - User goals and targets
- **Achievements** - Earned badges
- **SyncLogs** - Sync history and errors
- **UserSettings** - User preferences
- **NotificationPreferences** - Notification settings
- **Connections** - OAuth connections
- **ApiTokens** - API authentication tokens
- **AuditLogs** - Security audit trail

See [prisma/schema.prisma](prisma/schema.prisma) for schema details.

---

## 🔄 Data Sync Flow

```
1. User clicks "Sync All Platforms"
   ↓
2. syncService fetches platform list from database
   ↓
3. For each platform:
   a. Get stored OAuth credentials
   b. Call platform's API (LeetCode, GitHub, etc.)
   c. Parse response data
   ↓
4. Save data to database as TrackerEntry records
   ↓
5. Calculate stats (problems solved, time spent, etc.)
   ↓
6. Update user dashboard in real-time
   ↓
7. Log sync result in SyncLog table
```

---

## 🔐 Security

### Implemented
- ✅ NextAuth.js for authentication
- ✅ Password hashing with bcryptjs
- ✅ OAuth 2.0 (GitHub, Google)
- ✅ API key validation
- ✅ Rate limiting (100 req/15min)
- ✅ HTTPS/TLS encryption
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection (React escaping)
- ✅ CSRF protection (NextAuth)
- ✅ Secure cookies (HttpOnly, SameSite)

### Sensitive Data Handling
- OAuth tokens encrypted in database
- API keys never stored in code
- Sensitive logs never include passwords
- Data exports require authentication

---

## 🤝 Contributing

We love contributions! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for:
- Branch naming conventions
- Commit message format
- PR checklist
- How to add new platform integration

### Steps to Contribute

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and commit: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📈 Deployment

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PREM015/progresstracker)

### Manual Deployment

**Vercel:**
```bash
npm i -g vercel
vercel
```

**Azure:**
See [DEPLOYMENT.md](docs/DEPLOYMENT.md#-deployment-to-azure-enterprise)

**Docker:**
```bash
docker-compose up -d
```

Full deployment guide: [DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 🐛 Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Check DATABASE_URL in .env.local
- Verify PostgreSQL is running
- See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

**"OAuth login not working"**
- Verify CLIENT_ID and CLIENT_SECRET are set
- Check redirect URLs match GitHub/Google settings
- See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

**"Port 3000 already in use"**
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9
# Or use different port
npm run dev -- -p 3001
```

Full troubleshooting: [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## 📞 Support

- 📖 **Documentation:** See [docs/](docs/) folder
- 🐛 **Report Issues:** [GitHub Issues](https://github.com/PREM015/progresstracker/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/PREM015/progresstracker/discussions)
- 📧 **Email:** contact@progresstracker.app

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details

---

## ❤️ Acknowledgments

Built with amazing open-source projects:
- [Next.js](https://nextjs.org) - React framework
- [Prisma](https://www.prisma.io) - Database ORM
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [NextAuth.js](https://next-auth.js.org) - Authentication

---

## 🚀 Roadmap

- [ ] Mobile app (React Native)
- [ ] Team/Group tracking
- [ ] Advanced analytics (AI insights)
- [ ] Gamification (leaderboards)
- [ ] Browser extension
- [ ] Desktop app (Electron)

---

**Built with ❤️ by [PREM015](https://github.com/PREM015)**

⭐ If you find this useful, please star the repository!
