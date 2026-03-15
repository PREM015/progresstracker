# 🎨 Styling Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

ProgressTracker uses **Tailwind CSS** with the `shadcn/ui` component library.

---

## 🎨 Design Tokens

### Colors

```css
/* tailwind.config.ts */
colors: {
  primary: { DEFAULT: '#6366f1', /* indigo */ },
  secondary: { DEFAULT: '#8b5cf6', /* violet */ },
  accent: { DEFAULT: '#06b6d4', /* cyan */ },
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#6b7280',
}
```

### Typography

```bash
# Font: Inter (from Google Fonts)
# Sizes: Use Tailwind defaults (text-sm, text-base, text-lg, text-xl, text-2xl...)
# Weight: font-normal, font-medium, font-semibold, font-bold
```

---

## 🧱 Component Conventions

### Use `cn()` for conditional classes

```typescript
import { cn } from '@/lib/utils';

function Button({ variant, className }: Props) {
  return (
    <button className={cn(
      "px-4 py-2 rounded-lg font-medium transition-colors",
      variant === 'primary' && "bg-primary text-white hover:bg-primary/90",
      variant === 'ghost' && "bg-transparent hover:bg-muted/20",
      className  // allow override
    )}>
      {children}
    </button>
  );
}
```

### Dark Mode

```typescript
// Use dark: prefix for dark mode styles
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
```

---

## 📏 Spacing Conventions

| Use | Class |
|-----|-------|
| Page padding | `p-6` (desktop), `p-4` (mobile) |
| Card gap | `gap-4` |
| Section margin | `mb-8` |
| Form gap | `space-y-4` |

---

## 📱 Responsive Design

```typescript
// Mobile-first responsive
<div className="
  grid grid-cols-1           // Mobile: 1 column
  sm:grid-cols-2             // Tablet: 2 columns
  lg:grid-cols-4             // Desktop: 4 columns
  gap-4
">
```

---

## 📎 Related Docs

- [Component Architecture](01-component-architecture.md)
- [Design System Colors](../design-system/colors-typography.md)
