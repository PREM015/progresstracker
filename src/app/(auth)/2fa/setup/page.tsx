// app/(auth)/2fa/setup/page.tsx
'use client';

import React from 'react';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { AuthCard } from '@/components/auth/AuthCard';
import { Info, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TwoFactorSetupPage() {
  return (
    <div className="space-y-4">
      <AuthCard
        title="Enable Two-Factor Authentication"
        description="Add an extra layer of security to your account"
        showSocial={false}
      >
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                What you&apos;ll need
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>An authenticator app (Google Authenticator, Authy, etc.)</li>
                <li>Your device&apos;s camera to scan the QR code</li>
                <li>A secure place to store backup codes</li>
              </ul>
            </div>
          </div>
        </div>

        <TwoFactorSetup />
      </AuthCard>

      <div className="text-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings/security">← Back to Security Settings</Link>
        </Button>
      </div>
    </div>
  );
}