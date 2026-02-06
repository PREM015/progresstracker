'use client';

import React, { useState } from 'react';

interface TwoFactorAuthProps {
    onVerify: (code: string) => Promise<void>;
    onResendCode?: () => Promise<void>;
    className?: string;
}

export const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({
    onVerify,
    onResendCode,
    className = '',
}) => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`code-${index + 1}`);
            nextInput?.focus();
        }

        // Auto-submit when all filled
        if (newCode.every(c => c) && index === 5) {
            handleSubmit(newCode.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            const prevInput = document.getElementById(`code-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleSubmit = async (codeValue: string) => {
        setIsVerifying(true);
        setError(null);

        try {
            await onVerify(codeValue);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed');
            setCode(['', '', '', '', '', '']);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className={`bg-white border border-gray-200 rounded-2xl p-8 max-w-md mx-auto ${className}`}>
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔐</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Two-Factor Authentication</h2>
                <p className="text-gray-600">Enter the 6-digit code from your authenticator app</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
            )}

            <div className="flex gap-2 justify-center mb-6">
                {code.map((digit, index) => (
                    <input
                        key={index}
                        id={`code-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        disabled={isVerifying}
                        className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                ))}
            </div>

            {onResendCode && (
                <button
                    onClick={onResendCode}
                    className="w-full text-sm text-indigo-600 hover:text-indigo-700"
                >
                    Didn't receive a code? Resend
                </button>
            )}
        </div>
    );
};

export default TwoFactorAuth;
