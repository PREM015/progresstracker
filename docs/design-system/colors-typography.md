# 🎨 Colors & Typography

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Global Design Philosophy

ProgressTracker is designed to feel:
- **Fast and responsive** (like an IDE)
- **Focused and clean** (minimal distractions)
- **Motivating** (through strategic use of positive colors)

---

## 🎨 Color Palette (Tailwind)

Defined in `tailwind.config.ts`. We use semantic names that map to the underlying color scales.

### Brand Colors

| Token | Light Mode (Hex) | Dark Mode (Hex) | Usage |
|-------|-----------------|-----------------|-------|
| `primary` | `#6366f1` (Indigo 500) | `#818cf8` (Indigo 400) | Primary buttons, active states, links |
| `secondary` | `#8b5cf6` (Violet 500) | `#a78bfa` (Violet 400) | Secondary CTAs, badges |
| `accent` | `#06b6d4` (Cyan 500) | `#22d3ee` (Cyan 400) | Highlight accents |

### Semantic Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `success` | `#22c55e` (Green 500) | `#4ade80` (Green 400) | Completed goals, successful syncs, active streak |
| `warning` | `#f59e0b` (Amber 500) | `#fbbf24` (Amber 400) | Paused goals, streak at risk |
| `danger` | `#ef4444` (Red 500) | `#f87171` (Red 400) | Failed goals, broken streak, destructive actions |
| `info` | `#3b82f6` (Blue 500) | `#60a5fa` (Blue 400) | Tooltips, informational alerts |

### Heatmap Colors (Tailwind `bg-heat-*`)

| Level | Light Mode | Dark Mode | Activity Count |
|-------|------------|-----------|----------------|
| `level-0` | `#ebedf0` | `#161b22` | 0 activities |
| `level-1` | `#9be9a8` | `#0e4429` | 1-2 activities |
| `level-2` | `#40c463` | `#006d32` | 3-5 activities |
| `level-3` | `#30a14e` | `#26a641` | 6-9 activities |
| `level-4` | `#216e39` | `#39d353` | 10+ activities |

---

## 🖋️ Typography

We use **Inter** (via `next/font/google`) as our single font family to ensure optimal performance and sleek readability.

### Scale

| Variable | Class | Size | Line Height | Usage |
|----------|-------|------|-------------|-------|
| `h1` | `text-4xl font-bold` | 36px | 40px | Page titles, hero sections |
| `h2` | `text-3xl font-semibold`| 30px | 36px | Section headers |
| `h3` | `text-2xl font-semibold`| 24px | 32px | Card headers, widget titles |
| `p` (body) | `text-base font-normal` | 16px | 24px | Default body text |
| `small` | `text-sm font-normal` | 14px | 20px | Secondary text, timestamps |
| `tiny` | `text-xs font-medium` | 12px | 16px | Badges, tooltips |

### Weights

- **Regular (400)**: Used for all body text and paragraphs.
- **Medium (500)**: Used for buttons, inputs, and tab navigation.
- **Semibold (600)**: Used for component headers and sub-headers.
- **Bold (700)**: Used strictly for main page titles (`h1`).

---

## 📎 Related Docs

- [Components Library](components-library.md)
- [Styling Guide](../frontend/03-styling-guide.md)
