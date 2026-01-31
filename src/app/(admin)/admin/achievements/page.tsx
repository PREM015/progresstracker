// app/(admin)/admin/achievements/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Achievement Management',
  description: 'Create and manage user achievements',
};

export default function AchievementsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Achievement Management</h1>
      <p className="text-gray-600">
        Create and manage user achievements
      </p>
      {/* TODO: Implement AchievementsPage */}
    </div>
  );
}
