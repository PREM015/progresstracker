// app/(admin)/admin/blog/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog Management',
  description: 'Manage blog posts and content',
};

export default function BlogPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Blog Management</h1>
      <p className="text-gray-600">
        Manage blog posts and content
      </p>
      {/* TODO: Implement BlogPage */}
    </div>
  );
}
