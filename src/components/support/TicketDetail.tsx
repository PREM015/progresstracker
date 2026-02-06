'use client';

import React, { useState } from 'react';

interface Ticket {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    author: string;
    content: string;
    timestamp: string;
  }>;
  status: 'open' | 'closed';
}

interface TicketDetailProps {
  ticketId: string;
  className?: string;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticketId,
  className = '',
}) => {
  const [ticket] = useState<Ticket>({
    id: ticketId,
    title: 'Need help with sync',
    messages: [
      { id: '1', author: 'User', content: 'My LeetCode data is not syncing', timestamp: new Date().toISOString() },
    ],
    status: 'open',
  });

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold">{ticket.title}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          ticket.status === 'open' ? 'bg-green-100 text-green-700' : '

bg-gray-100 text-gray-700'
        }`}>
          {ticket.status}
        </span>
      </div>

      <div className="space-y-4">
        {ticket.messages.map(msg => (
          <div key={msg.id} className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="font-semibold">{msg.author}</div>
              <div className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</div>
            </div>
            <div className="text-gray-700">{msg.content}</div>
          </div>
        ))}
      </div>
    </div >
  );
};

export default TicketDetail;
