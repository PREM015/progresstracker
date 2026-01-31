// app/(dashboard)/support/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help and manage support tickets',
};

export default function SupportPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Support</h1>
      <p className="text-gray-600">
        Get help and manage support tickets
      </p>
      {/* TODO: Implement SupportPage */}
    </div>
  );
}
