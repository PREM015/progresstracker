// app/(admin)/admin/metrics/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Metrics',
  description: 'Monitor performance and analytics',
};

export default function MetricsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">System Metrics</h1>
      <p className="text-gray-600">
        Monitor performance and analytics
      </p>
      {/* TODO: Implement MetricsPage */}
    </div>
  );
}
