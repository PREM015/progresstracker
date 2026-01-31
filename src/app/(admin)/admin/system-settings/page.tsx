// app/(admin)/admin/system-settings/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Settings',
  description: 'Manage global application settings',
};

export default function SystemSettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">System Settings</h1>
      <p className="text-gray-600">
        Manage global application settings
      </p>
      {/* TODO: Implement SystemSettingsPage */}
    </div>
  );
}
