'use client';

export function AdminQuickActions() {
    const actions = [
        { label: 'New User', href: '/admin/users/new', icon: '👤', color: 'bg-blue-500/10 text-blue-400' },
        { label: 'Feature Flag', href: '/admin/feature-flags', icon: '🚩', color: 'bg-green-500/10 text-green-400' },
        { label: 'Broadcast Email', href: '/admin/email', icon: '📧', color: 'bg-purple-500/10 text-purple-400' },
        { label: 'System Settings', href: '/admin/system-settings', icon: '⚙️', color: 'bg-yellow-500/10 text-yellow-400' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {actions.map((action) => (
                <a
                    key={action.label}
                    href={action.href}
                    className={`p-6 rounded-xl border border-zinc-800 hover:border-indigo-500 transition-colors ${action.color}`}
                >
                    <div className="text-3xl mb-2">{action.icon}</div>
                    <div className="font-medium text-white">{action.label}</div>
                </a>
            ))}
        </div>
    );
}

export default AdminQuickActions;
