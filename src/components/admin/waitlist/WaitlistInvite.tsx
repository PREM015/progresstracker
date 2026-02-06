'use client';

import { useState } from 'react';

export function WaitlistInvite() {
    const [emails, setEmails] = useState('');
    const [sending, setSending] = useState(false);

    const sendInvites = async () => {
        const emailList = emails.split('\n').filter(e => e.trim());

        if (emailList.length === 0) {
            alert('Please enter at least one email');
            return;
        }

        if (!confirm(`Send invites to ${emailList.length} email(s)?`)) return;

        setSending(true);
        try {
            const res = await fetch('/api/admin/waitlist/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emails: emailList }),
            });

            if (!res.ok) throw new Error('Failed to send invites');
            alert('Invites sent successfully!');
            setEmails('');
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Send Invitations</h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        Email Addresses (one per line)
                    </label>
                    <textarea
                        value={emails}
                        onChange={(e) => setEmails(e.target.value)}
                        placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                        rows={8}
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono text-sm"
                    />
                </div>

                <button
                    onClick={sendInvites}
                    disabled={sending || !emails.trim()}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                >
                    {sending ? 'Sending...' : 'Send Invitations'}
                </button>
            </div>
        </div>
    );
}

export default WaitlistInvite;
