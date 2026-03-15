# ♿ Accessibility (a11y)

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Our Commitment

ProgressTracker aims to meet **WCAG 2.1 AA** compliance. Tracking your progress should be accessible to developers using screen readers, keyboard navigation, and custom color contrast themes.

---

## ⚡ Key Practices

### 1. Radix UI Primitives

All complex interactive components (Modals, Dropdowns, Tabs) must be built using Radix UI (via `shadcn/ui`) because they automatically handle:
- Keyboard focus trapping (for Modals)
- ARIA roles (e.g., `role="dialog"`, `role="tablist"`)
- Arrow key navigation
- Escape key to close

### 2. Focus Management

- **Visible Focus States**: Every interactive element (`a`, `button`, `input`) must have a clearly visible focus ring.
- Tailwind class used globally: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.

### 3. Screen Reader Text

Provide text context for visual elements (like icons or heatmaps) using the `sr-only` class.

```tsx
// Buttons with only icons must have screen-reader text
<Button size="icon">
  <SettingsIcon aria-hidden="true" />
  <span className="sr-only">Open Settings</span>
</Button>
```

### 4. Color Contrast

- All text must have a minimum contrast ratio of **4.5:1** against its background.
- Do not use color alone to convey meaning.

```tsx
// ❌ Bad: Relies only on color
<div className="text-red-500">Goal failed</div>

// ✅ Good: Uses text + icon + color
<div className="text-danger flex items-center gap-2">
  <XCircleIcon aria-hidden="true" />
  <span>Goal failed</span>
</div>
```

---

## 📊 Accessible Data Visualizations

Our heatmap and charts need special handling because `<canvas>` and `<svg>` are inherently opaque to screen readers.

### Heatmap approach:
1. Provide a visible summary text (`"450 contributions in the last year"`).
2. Render an invisible table with the data using `sr-only` so screen readers route tabular data properly.

---

## 🏎️ Testing Accessibility

Before merging UI PRs, developers must:
1. Navigate the new component entirely via Keyboard (`Tab`, `Space`, `Enter`, `Arrows`).
2. Run standard audits via Lighthouse in Chrome DevTools.
3. Keep an eye out for missing `aria-labels` on form inputs.

---

## 📎 Related Docs

- [Components Library](components-library.md)
- [Styling Guide](../frontend/03-styling-guide.md)
