# 🐳 Docker Development Setup

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

Docker Compose setup for local development with PostgreSQL and Redis pre-configured.

---

## 🚀 Quick Start

```bash
# Start database services
docker-compose up -d postgres redis

# Then run the app normally
npm run dev
```

---

## 📄 docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: progresstracker_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: localpassword
      POSTGRES_DB: progresstracker
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: progresstracker_redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 🔧 Environment for Docker

```env
# .env.local (when using Docker)
DATABASE_URL=postgresql://postgres:localpassword@localhost:5432/progresstracker
REDIS_URL=redis://localhost:6379
UPSTASH_REDIS_REST_URL=  # Leave empty to use local Redis
```

---

## 🛑 Useful Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f postgres

# Connect to PostgreSQL
docker exec -it progresstracker_postgres psql -U postgres -d progresstracker

# Reset database
docker-compose down -v  # Removes volumes (all data)
docker-compose up -d
```

---

## 📎 Related Docs

- [Local Setup](../deployment/01-local-setup.md)
- [Database Setup](../deployment/04-database-setup.md)
