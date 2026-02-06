"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/support/tickets/${ticketId}`).then(r => r.json()),
      fetch(`/api/support/tickets/${ticketId}/messages`).then(r => r.json())
    ])
      .then(([ticketData, messagesData]) => {
        setTicket(ticketData.ticket);
        setMessages(messagesData.messages || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [ticketId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      });
      const data = await res.json();
      setMessages([...messages, data.message]);
      setNewMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    await fetch(`/api/support/tickets/${ticketId}/close`, { method: 'POST' });
    setTicket({ ...ticket, status: 'CLOSED' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">🎫</span>
          <p className="mt-4 text-gray-500">Ticket not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{ticket.subject}</h1>
              <div className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-1 rounded ${ticket.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                    ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                      ticket.status === 'RESOLVED' ? 'bg-blue-100 text-blue-700' :
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
                  #{ticket.id.slice(0, 8)}
                </span>
              </div>
            </div>
            {ticket.status !== 'CLOSED' && (
              <button
                onClick={closeTicket}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close Ticket
              </button>
            )}
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Messages</h2>

          <div className="space-y-4 mb-6">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg ${message.isStaff
                    ? 'bg-indigo-50 border border-indigo-200'
                    : 'bg-gray-50 border border-gray-200'
                  }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">
                    {message.isStaff ? '🛠️ Support Team' : '👤 You'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700">{message.content}</p>
              </div>
            ))}
          </div>

          {ticket.status !== 'CLOSED' && (
            <div>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
                placeholder="Type your message..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
