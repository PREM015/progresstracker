'use client';

import React from 'react';

interface TicketFormProps {
  onSubmit: (data: { subject: string; category: string; description: string }) => void;
  className?: string;
}

export const TicketForm: React.FC<TicketFormProps> = ({
  onSubmit,
  className = '',
}) => {
  const [formData, setFormData] = React.useState({ subject: '', category: 'general', description: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Create Support Ticket</h3>

      <div className="space-y-4">
        <div>
          <label className="block font-medium mb-2">Subject *</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Brief description of your issue"
          />
        </div>

        <div>
          <label className="block font-medium mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="general">General</option>
            <option value="technical">Technical Issue</option>
            <option value="billing">Billing</option>
            <option value="feature">Feature Request</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-2">Description *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            rows={6}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Provide detailed information about your issue"
          />
        </div>

        <button
          type="submit"
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Submit Ticket
        </button>
      </div>
    </form>
  );
};

export default TicketForm;
