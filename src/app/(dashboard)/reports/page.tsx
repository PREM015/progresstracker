// app/(dashboard)/reports/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reports',
  description: 'View your generated reports and analytics',
};

export default function ReportsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Reports</h1>
      <p className="text-gray-600">
        View your generated reports and analytics
      </p>
      {/* TODO: Implement ReportsPage */}
    </div>
  );
}
