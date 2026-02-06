'use client';

import React from 'react';

interface SettingsPageProps {
  className?: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-6xl mx-auto p-8">
        {/* Would compose SettingsNavigation and other settings components */}
        <div className="flex gap-8">
          <aside className="w-64">
            <div className="bg-white border rounded-xl p-4">
              <nav className="space-y-1">
                {['Profile', 'Account', 'Security', 'Notifications', 'Privacy'].map(item => (
                  <a
                    key={item}
                    href={`/settings/${item.toLowerCase()}`}
                    className="block px-4 py-2 rounded-lg hover:bg-gray-100"
                  >
                    {item}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <main className="flex-1">
            <div className="bg-white border rounded-xl p-8">
              <h1 className="text-3xl font-bold mb-6">Settings</h1>
              <p className="text-gray-600">Select a category from the sidebar</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
