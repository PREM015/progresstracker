'use client';
import { useState } from 'react';
export function EmailTestSend({ templateId }: any) {
    const [email, setEmail] = useState('');
    const handleSend = async () => { await fetch(`/api/admin/email/templates/${templateId}/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); alert('Test email sent'); };
    return <div className="flex gap-2"><input type="email" placeholder="Test email address" value={email} onChange={e => setEmail(e.target.value)} className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><button onClick={handleSend} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Send Test</button></div>;
}
export default EmailTestSend;
