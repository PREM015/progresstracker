import { RootLayout } from '@/components/layouts/RootLayout';

export const metadata = {
  title: 'Progress Tracker',
  description: 'Track your coding journey',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootLayout>{children}</RootLayout>;
}
