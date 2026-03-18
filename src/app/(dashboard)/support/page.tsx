"use client";

import { useState, useEffect } from "react";

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadTickets = () => {
    setLoading(true);
    setError(false);
    // Correct API route: /api/support-tickets (not /api/support/tickets)
    fetch('/api/support-tickets')
      .then(r => r.json())
      .then(data => setTickets(data?.tickets ?? data?.data?.tickets ?? data?.items ?? []))
      .catch(err => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTickets(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">Support</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">Get help with your account and progress tracking</p>
          </div>
          <a
            href="/support/tickets/new"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + New Ticket
          </a>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">Your Tickets</h2>

              {error ? (
                <div className="text-center py-12">
                  <span className="text-5xl">⚠️</span>
                  <p className="mt-4 text-zinc-500 dark:text-zinc-400">Failed to load tickets. Please try again.</p>
                  <button
                    onClick={loadTickets}
                    className="mt-3 text-sm text-indigo-600 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-5xl">🎫</span>
                  <p className="mt-4 text-zinc-500 dark:text-zinc-400">No support tickets yet</p>
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">Need help? Create a new ticket to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map(ticket => (
                    <a
                      key={ticket.id}
                      href={`/support/tickets/${ticket.id}`}
                      className="block p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:shadow-md transition bg-white dark:bg-zinc-800"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-zinc-900 dark:text-white">{ticket.subject}</h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">#{ticket.id.slice(0, 8)}</p>
                        </div>
                        <span className={`px-3 py-1 text-sm rounded-full ${
                          ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2">{ticket.message}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                        Created {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
              <h3 className="font-bold mb-4 text-zinc-900 dark:text-white">📚 Knowledge Base</h3>
              <div className="space-y-3">
                <a href="/support/knowledge-base" className="block text-indigo-600 hover:underline">Getting Started Guide</a>
                <a href="/support/knowledge-base" className="block text-indigo-600 hover:underline">Platform Integration</a>
                <a href="/support/knowledge-base" className="block text-indigo-600 hover:underline">Goals & Tracking</a>
                <a href="/support/knowledge-base" className="block text-indigo-600 hover:underline">Billing & Subscription</a>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
              <h3 className="font-bold mb-4 text-zinc-900 dark:text-white">💬 Quick Help</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Average response time: 2 hours</p>
              <a href="mailto:support@progresstracker.app" className="text-sm text-indigo-600 hover:underline">
                support@progresstracker.app
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
