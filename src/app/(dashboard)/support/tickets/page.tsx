"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch(`/api/support/tickets${filter !== 'all' ? `?status=${filter}` : ''}`)
      .then(r => r.json())
      .then(data => setTickets(data.tickets || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Support Tickets</h1>
          <Link
            href="/support/tickets/new"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            New Ticket
          </Link>
        </div>

        <div className="flex gap-2 mb-6">
          {['all', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm ${filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {tickets.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">🎫</span>
            <p className="mt-4 text-gray-500">No tickets found</p>
            <Link
              href="/support/tickets/new"
              className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create First Ticket
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map(ticket => (
              <Link
                key={ticket.id}
                href={`/support/tickets/${ticket.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{ticket.subject}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`px-2 py-1 rounded ${ticket.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                          ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                        {ticket.status}
                      </span>
                      <span className={`px-2 py-1 rounded ${ticket.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                          ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                        {ticket.priority}
                      </span>
                      <span className="text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">#{ticket.id.slice(0, 8)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
