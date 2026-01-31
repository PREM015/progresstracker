// app/(admin)/admin/waitlist/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Waitlist Management',
  description: 'Manage waitlist entries, send invites, and track conversions',
};

export default function WaitlistPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Waitlist Management</h1>
      <p className="text-gray-600">
        Manage waitlist entries, send invites, and track conversions
      </p>
      {/* TODO: Implement WaitlistPage */}
    </div>
  );
}
