'use client';

import React from 'react';

interface UnauthorizedProps {
    message?: string;
    className?: string;
}

export const Unauthorized: React.FC<UnauthorizedProps> = ({
    message = 'You don't have permission to access this page.',
  className = '',
}) => {
    return (
        <div className={`min-h-screen bg-gray-50 flex items-center justify-center p-8 ${className}`}>
            <div className="bg-white border rounded-2xl p-12 max-w-md w-full text-center">
                <div className="text-8xl mb-6">🔒</div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
                <p className="text-gray-600 mb-8">{message}</p>

                <div className="flex gap-3">
                    <a
                        href="/login"
                        className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50 inline-block"
                    >
                        Login
                    </a>
                    <a
                        href="/"
                        className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-block"
                    >
                        Go Home
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;
