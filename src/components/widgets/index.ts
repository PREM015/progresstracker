/**
 * Widgets Barrel Export
 * Location: components/widgets/index.ts
 * 
 * Central export file for all widget components
 */

// ===== DISPLAY WIDGETS =====
export { StatWidget } from './StatWidget';
export type { StatWidgetProps } from './StatWidget';

export { ProgressWidget, ProgressItem } from './ProgressWidget';
export type { ProgressWidgetProps } from './ProgressWidget';

export { ListWidget } from './ListWidget';
export type { ListWidgetProps, ListItem } from './ListWidget';

export { ChartWidget } from './ChartWidget';
export type { ChartWidgetProps, ChartDataPoint } from './ChartWidget';

// ===== TIME WIDGETS =====
export { CountdownWidget } from './CountdownWidget';
export type { CountdownWidgetProps } from './CountdownWidget';

export { TimeAgo } from './TimeAgo';
export type { TimeAgoProps } from './TimeAgo';

// ===== ACTION WIDGETS =====
export { CopyButton, copyToClipboard } from './CopyButton';
export type { CopyButtonProps } from './CopyButton';

// ===== PREFERENCE WIDGETS =====
export { ThemeToggle } from './ThemeToggle';
export type { ThemeToggleProps, Theme } from './ThemeToggle';

export { LanguageSelect, getBrowserLanguage } from './LanguageSelect';
export type { LanguageSelectProps, Language } from './LanguageSelect';
