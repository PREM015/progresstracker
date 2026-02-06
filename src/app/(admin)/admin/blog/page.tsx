import { BlogPostsList, BlogCategories } from '@/components/admin';
import Link from 'next/link';

export default function BlogPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Blog</h1>
          <p className="text-zinc-400">Manage blog posts and categories</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          New Post
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BlogPostsList />
        </div>
        <div>
          <BlogCategories />
        </div>
      </div>
    </div>
  );
}
