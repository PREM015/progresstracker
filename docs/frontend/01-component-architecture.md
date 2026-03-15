# 🎨 Component Architecture

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

ProgressTracker uses a **component hierarchy** where:
- `ui/` = Design system primitives (dumb components)
- `shared/` = Shared layout components with business logic
- Feature folders = Feature-specific components

---

## 🗂️ Component Structure

```
src/components/
├── ui/                     # shadcn/ui primitives
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── badge.tsx
│   └── ...
│
├── shared/                 # Shared across features
│   ├── Navbar.tsx          # Top navigation bar
│   ├── Sidebar.tsx         # Dashboard sidebar
│   ├── Footer.tsx          # Landing page footer
│   ├── ThemeToggle.tsx     # Dark/light mode toggle
│   ├── LoadingSpinner.tsx
│   └── ErrorBoundary.tsx
│
├── auth/                   # Auth-specific
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── OAuthButtons.tsx    # GitHub/Google buttons
│   └── TwoFactorInput.tsx
│
├── dashboard/              # Dashboard widgets
│   ├── StatsCards.tsx      # Overview stat cards
│   ├── ActivityHeatmap.tsx # 365-day heatmap
│   ├── StreakDisplay.tsx   # Current streak widget
│   ├── RecentActivity.tsx  # Recent entries list
│   ├── GoalsWidget.tsx     # Active goals progress
│   └── PlatformsList.tsx  # Connected platforms
│
├── goals/
│   ├── GoalCard.tsx
│   ├── GoalForm.tsx
│   ├── GoalProgressBar.tsx
│   └── GoalFilters.tsx
│
├── platforms/
│   ├── PlatformCard.tsx
│   ├── ConnectModal.tsx
│   └── SyncButton.tsx
│
└── analytics/
    ├── MonthlyChart.tsx
    ├── PlatformBreakdown.tsx
    └── StatsTrends.tsx
```

---

## 🔑 Component Principles

### Server vs Client Components

```typescript
// SERVER COMPONENT (default in App Router)
// - No useState, useEffect, event handlers
// - Can directly fetch data (async component)
async function StatsCards({ userId }: { userId: string }) {
  const stats = await prisma.user.findUnique({ where: { id: userId } });
  return <div>{stats.totalProblems}</div>;
}

// CLIENT COMPONENT (must add 'use client')
// - Can use hooks, event handlers
'use client';
function SyncButton({ platformId }: { platformId: string }) {
  const [syncing, setSyncing] = useState(false);
  // ...
}
```

### Component Naming

| Type | Convention | Example |
|------|-----------|---------|
| Pages | `page.tsx` | `app/dashboard/page.tsx` |
| Layouts | `layout.tsx` | `app/(dashboard)/layout.tsx` |
| Components | PascalCase | `StatsCards.tsx` |
| Hooks | camelCase with `use` prefix | `useGoals.ts` |

---

## 📎 Related Docs

- [State Management](02-state-management.md)
- [Styling Guide](03-styling-guide.md)
- [Folder Structure](../architecture/03-folder-structure.md)
