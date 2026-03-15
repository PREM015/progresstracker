# 🧱 Components Library

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

ProgressTracker uses [shadcn/ui](https://ui.shadcn.com/) heavily customized with our own Tailwind theme. Our components are highly accessible (built on Radix UI) and easy to compose.

---

## 📦 Core Primitives (ui/)

### 🔘 Buttons

The `Button` component supports variants and sizes using `class-variance-authority` (cva).

```tsx
import { Button } from "@/components/ui/button"

<Button variant="default">Primary CTA</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Bordered Button</Button>
<Button variant="ghost">Invisible Border</Button>
<Button variant="destructive">Delete Item</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="icon"><SettingsIcon /></Button> // Icon-only
```

### 🏷️ Badges

Used for tags, statuses, and platform labels.

```tsx
import { Badge } from "@/components/ui/badge"

<Badge variant="default">Active</Badge>
<Badge variant="secondary">Draft</Badge>
<Badge variant="destructive">Failed</Badge>
<Badge variant="outline">Platform: GitHub</Badge>
```

### 📝 Form Inputs (Zod + React Hook Form)

Inputs must always be wrapped in `Form` components to handle standard validation errors.

```tsx
// Using shadcn forms with standard text input
<FormField
  control={form.control}
  name="username"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Username</FormLabel>
      <FormControl>
        <Input placeholder="prem015" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## 🧩 Shared Components (shared/)

### 📊 Progress Bar

Custom progress bar for goals and milestone tracking.

```tsx
import { GoalProgress } from "@/components/shared/GoalProgress"

<GoalProgress 
  current={45} 
  target={100} 
  metric="problems" 
  status="ACTIVE" // Determines color
/>
```

### 🔥 Heatmap Widget

The signature 365-day contribution calendar. Expects raw date data and groups them directly on the client.

```tsx
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap"

<ActivityHeatmap 
  entries={trackerEntries} 
  year={2026} 
/>
```

### 🔔 Toasts

For notifications and error reporting, we rely on `sonner`.

```tsx
import { toast } from "sonner"

// Success
toast.success("Goal created successfully!")

// Error with action
toast.error("Failed to sync GitHub", {
  action: {
    label: "Retry",
    onClick: () => retrySync()
  }
})
```

---

## 📎 Related Docs

- [Colors & Typography](colors-typography.md)
- [Accessibility](accessibility.md)
- [Component Architecture](../frontend/01-component-architecture.md)
