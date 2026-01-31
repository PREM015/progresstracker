// app/(admin)/admin/changelog/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog Management',
  description: 'Manage version updates and release notes',
};

export default function ChangelogPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Changelog Management</h1>
      <p className="text-gray-600">
        Manage version updates and release notes
      </p>
      {/* TODO: Implement ChangelogPage */}
    </div>
  );
}
