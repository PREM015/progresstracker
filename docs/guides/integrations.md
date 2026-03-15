# 🔌 Integrations Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🔌 Current Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| GitHub | Platform sync (OAuth) | ✅ Active |
| Google | OAuth login | ✅ Active |
| LeetCode | Platform sync (scraping) | ✅ Active |
| HackerRank | Platform sync (API key) | ✅ Active |
| Codeforces | Platform sync (scraping) | ✅ Active |
| Stripe | Payments | ✅ Active |
| Brevo | Email | ✅ Active |
| Upstash Redis | Caching + rate limiting | ✅ Active |
| Neon PostgreSQL | Database | ✅ Active |
| Supabase Storage | File storage | ✅ Active |
| Trigger.dev | Background jobs | ✅ Active |
| Sentry | Error monitoring | ✅ Active |
| Vercel | Hosting | ✅ Active |

---

## 🚀 Planned Integrations

| Service | Purpose | Timeline |
|---------|---------|----------|
| AtCoder | Platform sync | Q2 2026 |
| CodeChef | Platform sync | Q2 2026 |
| Duolingo | Language learning | Q3 2026 |
| Kaggle | Data science | Q3 2026 |
| Zapier | Automation | Q4 2026 |

---

## 🔑 API Integration (Pro+)

Use ProgressTracker as a data source in your own applications:

```bash
# Get your API key: Settings → API Keys → Generate

curl https://vriddhi-app.vercel.app/api/stats \
  -H "Authorization: Bearer pt_live_your_key_here"
```

Response:
```json
{
  "data": {
    "totalProblems": 450,
    "currentStreak": 23,
    "platformsConnected": 5,
    "achievementsEarned": 18
  }
}
```

---

## 📎 Related Docs

- [API Overview](../api/01-api-overview.md)
- [Sync Architecture](../sync/01-sync-architecture.md)
- [Roadmap](roadmap.md)
