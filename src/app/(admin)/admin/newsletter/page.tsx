// app/(admin)/admin/newsletter/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Newsletter Management',
  description: 'Manage newsletter subscribers and campaigns',
};

export default function NewsletterPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Newsletter Management</h1>
      <p className="text-gray-600">
        Manage newsletter subscribers and campaigns
      </p>
      {/* TODO: Implement NewsletterPage */}
    </div>
  );
}
