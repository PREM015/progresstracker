// app/(admin)/admin/maintenance/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Maintenance Windows',
  description: 'Schedule and manage system maintenance',
};

export default function MaintenancePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Maintenance Windows</h1>
      <p className="text-gray-600">
        Schedule and manage system maintenance
      </p>
      {/* TODO: Implement MaintenancePage */}
    </div>
  );
}
