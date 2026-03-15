# 🐙 GitHub Sync Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## ⚡ Quick Setup

1. Go to **Settings → Connected Platforms**
2. Click **Connect GitHub**
3. Authorize ProgressTracker on GitHub
4. Click **Sync Now**

---

## 📊 What Gets Synced

| Data | Description |
|------|-------------|
| Commits | All commits across your repos |
| Pull Requests | PRs you've opened/merged |
| Contributions | GitHub contribution graph data |

---

## 🔐 Permissions Required

When connecting GitHub, we request:

| Scope | Why |
|-------|-----|
| `read:user` | Get your GitHub username |
| `repo` | Read commits from private repos |
| `read:org` | Include org contributions |

> **Note**: We never modify your GitHub data. Read-only access.

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Private repos not syncing | Ensure `repo` scope is granted |
| Old data not importing | GitHub API only returns last 100 commits by default |
| Commits doubled | Check for duplicate repo connections |

---

## 📎 Related Docs

- [Sync Architecture](../01-sync-architecture.md)
- [Platform Scrapers](../02-platform-scrapers.md)
