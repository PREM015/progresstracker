# 🔫 Load Testing Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

Load testing ensures ProgressTracker can handle expected traffic without degrading performance.

---

## 🛠️ Tools

| Tool | Use |
|------|-----|
| **k6** | API load testing |
| **Playwright** | Browser-based load tests |
| **Artillery** | Scenario-based load tests |

---

## ⚡ Quick Load Test with k6

```javascript
// k6-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,           // 100 virtual users
  duration: '2m',     // for 2 minutes
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% under 300ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
  },
};

export default function () {
  const res = http.get('https://vriddhi-app.vercel.app/api/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

```bash
# Install k6
npm install -g k6

# Run load test
k6 run k6-test.js
```

---

## 📊 Target Performance

| Scenario | Expected Load | Target Response |
|----------|--------------|-----------------|
| Homepage | 1000 req/min | < 200ms |
| Dashboard API | 500 req/min | < 300ms |
| Sync trigger | 100 req/min | < 500ms |
| Leaderboard | 200 req/min | < 200ms (cached) |

---

## ⚠️ Load Test Rules

- **Never run against production** without warning users
- Always run against staging environment first
- Monitor Sentry and Upstash during tests
- Set up alerts before running (CPU > 80%, error rate > 1%)

---

## 📎 Related Docs

- [Optimization Guide](01-optimization-guide.md)
- [Caching Strategy](02-caching-strategy.md)
- [Monitoring Setup](../deployment/05-monitoring-setup.md)
