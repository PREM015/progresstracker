import { PublicLayout } from '@/components/layouts/PublicLayout';

export const metadata = {
  title: "Progress Tracker",
  description: "Track your progress across multiple platforms",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}
