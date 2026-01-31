// app/(admin)/admin/feature-flags/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feature Flags',
  description: 'Toggle features and manage rollouts',
};

export default function FeatureFlagsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Feature Flags</h1>
      <p className="text-gray-600">
        Toggle features and manage rollouts
      </p>
      {/* TODO: Implement FeatureFlagsPage */}
    </div>
  );
}
