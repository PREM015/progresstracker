'use client';

import React, { useState, useEffect } from 'react';

interface Ticket {
  id: string;
  title: string;
  status: 'open' | 'closed';
  createdAt: string;
}

interface TicketsListProps {
  className?: string;
}

export const TicketsList: React.FC<TicketsListProps> = ({
  className = '',
}) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    fetch('/api/support/tickets')
      .then(r => r.json())
      .then(data => setTickets(data));
  }, []);

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Support Tickets</h3>

      <div className="space-y-3">
        {tickets.map(ticket => (
          <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <div>
              <div className="font-semibold">{ticket.title}</div>
              <div className="text-sm text-gray-600">{new Date(ticket.createdAt).toLocaleDateString()}</div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${ticket.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
              {ticket.status}
            </span>
          </div>
        ))}

        {tickets.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-5xl mb-4 block">🎫</span>
            No support tickets
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsList;
