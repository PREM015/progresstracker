'use client';

import React from 'react';

interface NotFoundProps {
    className?: string;
}

export const NotFound: React.FC<NotFoundProps> = ({
    className = '',
}) => {
    return (
        <div className={`min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center p-8 ${className}`}>
            <div className="bg-white rounded-2xl p-12 max-w-md w-full text-center">
                <div className="text-8xl mb-6">🔍</div>
                <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h2>
                <p className="text-gray-600 mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50"
                    >
                        Go Back
                    </button>
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

export default NotFound;
