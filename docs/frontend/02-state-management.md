# 🗃️ State Management

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

ProgressTracker uses a **layered approach** to state management:

| Layer | Tool | Use |
|-------|------|-----|
| Server state | SWR | API data fetching and caching |
| Client state | React useState | Local UI state (modals, forms) |
| Global UI state | React Context | Theme, sidebar state |

---

## 🔄 SWR (Server State)

SWR is used for all API data fetching:

```typescript
// hooks/useGoals.ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.data);

export function useGoals() {
  const { data, error, isLoading, mutate } = useSWR('/api/goals', fetcher, {
    revalidateOnFocus: true,    // refresh when tab comes back into focus
    refreshInterval: 300_000,  // refresh every 5 minutes
  });
  
  return { goals: data, error, isLoading, mutate };
}

// Usage in component
function GoalsWidget() {
  const { goals, isLoading } = useGoals();
  if (isLoading) return <Skeleton />;
  return <GoalsList goals={goals} />;
}
```

---

## ⚡ Optimistic Updates

For instant UI feedback:

```typescript
async function createEntry(data: NewEntry) {
  // Optimistically update UI immediately
  mutate('/api/tracker', [...entries, { ...data, id: 'temp' }], false);
  
  // Then make the real API call
  await fetch('/api/tracker', { method: 'POST', body: JSON.stringify(data) });
  
  // Revalidate to get real data from server
  mutate('/api/tracker');
}
```

---

## 🌐 React Context (Global State)

```typescript
// contexts/ThemeContext.tsx
export const ThemeContext = createContext<{
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}>({ theme: 'light', toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light') }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

---

## 📎 Related Docs

- [Component Architecture](01-component-architecture.md)
- [API Overview](../api/01-api-overview.md)
