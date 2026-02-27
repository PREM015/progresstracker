// ============================================================================
// FILE: src/styles/themes.ts
// PURPOSE: Theme configuration with CSS variables and color palettes
// ============================================================================

export const themes = {
    light: {
        name: 'light',
        colors: {
            background: 'hsl(0 0% 100%)',
            foreground: 'hsl(222.2 84% 4.9%)',
            card: 'hsl(0 0% 100%)',
            cardForeground: 'hsl(222.2 84% 4.9%)',
            popover: 'hsl(0 0% 100%)',
            popoverForeground: 'hsl(222.2 84% 4.9%)',
            primary: 'hsl(221.2 83.2% 53.3%)',
            primaryForeground: 'hsl(210 40% 98%)',
            secondary: 'hsl(210 40% 96.1%)',
            secondaryForeground: 'hsl(222.2 47.4% 11.2%)',
            muted: 'hsl(210 40% 96.1%)',
            mutedForeground: 'hsl(215.4 16.3% 46.9%)',
            accent: 'hsl(210 40% 96.1%)',
            accentForeground: 'hsl(222.2 47.4% 11.2%)',
            destructive: 'hsl(0 84.2% 60.2%)',
            destructiveForeground: 'hsl(210 40% 98%)',
            border: 'hsl(214.3 31.8% 91.4%)',
            input: 'hsl(214.3 31.8% 91.4%)',
            ring: 'hsl(221.2 83.2% 53.3%)',
            // Custom colors for the app
            success: 'hsl(142.1 76.2% 36.3%)',
            warning: 'hsl(45.4 93.4% 47.5%)',
            info: 'hsl(199.4 95.5% 53.8%)',
            // Platform-specific colors
            github: 'hsl(0 0% 13%)',
            leetcode: 'hsl(36 100% 50%)',
            codeforces: 'hsl(210 100% 56%)',
            // Streak colors
            streakActive: 'hsl(142.1 76.2% 36.3%)',
            streakAtRisk: 'hsl(45.4 93.4% 47.5%)',
            streakBroken: 'hsl(0 84.2% 60.2%)',
        },
    },
    dark: {
        name: 'dark',
        colors: {
            background: 'hsl(222.2 84% 4.9%)',
            foreground: 'hsl(210 40% 98%)',
            // Add other dark mode colors relative to light mode if needed, 
            // typically shadcn uses CSS variables that flip automatically
            // so this object might be used for specific JS-driven theme logic
            // or to override defaults.
        },
    },
};

// CHART COLORS:
export const chartColors = {
    light: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
    dark: ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6'],
};

// HEATMAP COLORS:
export const heatmapColors = {
    light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
};

// ACHIEVEMENT RARITY COLORS:
export const rarityColors = {
    common: { bg: '#9ca3af', text: '#1f2937' },
    rare: { bg: '#3b82f6', text: '#ffffff' },
    epic: { bg: '#8b5cf6', text: '#ffffff' },
    legendary: { bg: '#f59e0b', text: '#1f2937' },
};
