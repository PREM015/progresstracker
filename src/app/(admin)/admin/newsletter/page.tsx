import { NewsletterDashboard, NewsletterList, SubscribersList } from '@/components/admin';
import Link from 'next/link';

export default function NewsletterPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Newsletter</h1>
          <p className="text-zinc-400">Manage newsletters and subscribers</p>
        </div>
        <Link
          href="/admin/newsletter/compose"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          Compose Newsletter
        </Link>
      </div>

      <NewsletterDashboard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <NewsletterList />
        </div>
        <div>
          <SubscribersList />
        </div>
      </div>
    </div>
  );
}
