'use client';

import React, { useState } from 'react';

interface TicketReplyProps {
  ticketId: string;
  onSubmit: (content: string) => Promise<void>;
  className?: string;
}

export const TicketReply: React.FC<TicketReplyProps> = ({
  ticketId,
  onSubmit,
  className = '',
}) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`bg-white border rounded-xl p-6 ${className}`}>
      <h4 className="font-semibold mb-4">Reply to Ticket</h4>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        required
        className="w-full px-4 py-2 border rounded-lg mb-4"
        placeholder="Type your reply..."
      />

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? 'Sending...' : 'Send Reply'}
      </button>
    </form>
  );
};

export default TicketReply;
