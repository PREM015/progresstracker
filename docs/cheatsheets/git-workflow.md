# 🌳 Git Workflow Cheatsheet

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🔄 Daily Workflow

```bash
# 1. Ensure you have the latest main
git checkout main
git pull origin main

# 2. Create a fresh branch for your feature/bug
git checkout -b feature/add-new-dashboard-widget
# or: git checkout -b fix/auth-token-refresh

# 3. Make changes and format
npm run format
npm run lint

# 4. Stage and commit following conventional commits
git add .
git commit -m "feat: add heatmap widget to dashboard"

# 5. Push branch
git push origin feature/add-new-dashboard-widget
```

---

## 📝 Commit Message Convention

ProgressTracker follows [Conventional Commits](https://www.conventionalcommits.org/).

**Format**: `<type>(<scope>): <subject>`

| Type | When to use | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(api): add export endpoint` |
| `fix` | Bug fix | `fix(auth): resolve session expiry bug` |
| `docs` | Documentation changes | `docs: update migration guide` |
| `style` | Formatting, missing semi colons, etc | `style: run prettier` |
| `refactor`| Code change that neither fixes bug nor adds feature | `refactor(components): extract button` |
| `test` | Adding tests | `test(sync): add webhook tests` |
| `chore` | Updating dependencies, build process | `chore: update next.js to 14.2` |

---

## 🔀 Rebasing over Merging

To keep a clean history, prefer rebasing feature branches on top of `main` instead of merging `main` into your feature branch.

```bash
git checkout feature/your-branch
git fetch origin
git rebase origin/main
# fix any conflicts, then:
git rebase --continue
# Push with force (since history changed)
git push -f origin feature/your-branch
```

---

## 🗑️ Cleanup

```bash
# Delete branch locally after merging
git branch -d feature/your-branch

# Prune remote tracking branches
git fetch -p
```

## 📎 Related Docs
- [Contributing Guidelines](../../CONTRIBUTING.md)
