import { ROUTES } from "@/lib/constants"

export const mainNavigation = [
  {
    name: "Dashboard",
    href: ROUTES.DASHBOARD,
    icon: "LayoutDashboard",
    description: "View your progress overview",
  },
  {
    name: "Tracker",
    href: ROUTES.TRACKER,
    icon: "Calendar",
    description: "Log daily activities",
  },
  {
    name: "Connections",
    href: ROUTES.CONNECTIONS,
    icon: "Link",
    description: "Manage platform connections",
  },
  {
    name: "Analytics",
    href: ROUTES.ANALYTICS,
    icon: "BarChart",
    description: "View detailed analytics",
  },
  {
    name: "Goals",
    href: ROUTES.GOALS,
    icon: "Target",
    description: "Track your goals",
  },
  {
    name: "Settings",
    href: ROUTES.SETTINGS,
    icon: "Settings",
    description: "Manage your account",
  },
]

export const footerLinks = {
  product: [
    { name: "Features", href: "/#features" },
    { name: "Pricing", href: "/#pricing" },
    { name: "Changelog", href: "/changelog" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact" },
  ],
  legal: [
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
    { name: "License", href: "/license" },
  ],
  social: [
    { name: "Twitter", href: "https://twitter.com/codesyncpro" },
    { name: "GitHub", href: "https://github.com/codesyncpro" },
    { name: "Discord", href: "https://discord.gg/codesyncpro" },
  ],
}