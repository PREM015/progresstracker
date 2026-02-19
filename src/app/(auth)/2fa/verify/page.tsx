// app/(auth)/2fa/verify/page.tsx
'use client';

import React, { Suspense } from 'react';
import { TwoFactorVerify } from '@/components/auth/TwoFactorVerify';
import { AuthCard } from '@/components/auth/AuthCard';
import { Loader2 } from 'lucide-react';

function TwoFactorVerifyContent() {
  return <TwoFactorVerify />;
}

export default function TwoFactorVerifyPage() {
  return (
    <Suspense fallback={
      <AuthCard title="Loading..." showSocial={false}>
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthCard>
    }>
      <TwoFactorVerifyContent />
    </Suspense>
  );
}