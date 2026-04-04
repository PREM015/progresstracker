'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, Lock, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ShieldX, Key, UserCheck, Smartphone } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VerifyShellProps {
  type?: 'email' | 'account' | 'mfa' | 'recovery';
  status?: 'loading' | 'success' | 'error';
}

export const VerifyShell = ({ type = 'email', status: initialStatus = 'loading' }: VerifyShellProps) => {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (initialStatus === 'loading') {
      const timer = setTimeout(() => setStatus('success'), 2000);
      return () => clearTimeout(timer);
    }
  }, [initialStatus]);

  const config = {
    email: { 
      icon: <Mail className="h-10 w-10" />, 
      title: 'Email Verification', 
      successMsg: 'Your email address has been verified successfully.',
      errorMsg: 'The verification link for your email is invalid or has expired.'
    },
    account: { 
      icon: <UserCheck className="h-10 w-10" />, 
      title: 'Account Activation', 
      successMsg: 'Your account has been activated. Welcome to the platform!',
      errorMsg: 'We could not activate your account with the provided token.'
    },
    mfa: { 
       icon: <Smartphone className="h-10 w-10" />, 
       title: 'Two-Factor Auth', 
       successMsg: 'Authentication successful. You are now securely logged in.',
       errorMsg: 'The 2FA token provided is incorrect or has expired.'
    },
    recovery: { 
       icon: <Lock className="h-10 w-10" />, 
       title: 'Password Recovery', 
       successMsg: 'Your identity has been confirmed. You can now reset your password.',
       errorMsg: 'The password recovery link is no longer valid.'
    }
  }[type];

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto min-h-[450px]">
      <div className="mb-8 relative">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${
          status === 'loading' ? 'bg-primary/10 border-primary/20 animate-pulse' :
          status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600' :
          'bg-red-500/10 border-red-500/20 text-red-600'
        }`}>
          {status === 'loading' ? <RefreshCw className="h-10 w-10 animate-spin text-primary" /> : 
           status === 'success' ? <CheckCircle2 className="h-10 w-10 shadow-2xl" /> : 
           <ShieldX className="h-10 w-10" />}
        </div>
        {status === 'success' && (
          <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-1.5 shadow-xl">
             <ShieldCheck className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="text-center space-y-4 mb-8">
        <Badge variant="outline" className="px-3 py-1 uppercase tracking-widest text-[10px] font-bold border-muted">
           {config.title}
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {status === 'loading' ? 'Verifying...' : 
           status === 'success' ? 'Verification Complete' : 
           'Verification Failed'}
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {status === 'loading' ? 'Please hold while we process your request and secure your session.' : 
           status === 'success' ? config.successMsg : 
           config.errorMsg}
        </p>
      </div>

      <GlassCard className="w-full p-8 border-primary/5 bg-background/50 backdrop-blur-xl">
         <div className="space-y-4">
            {status === 'loading' ? (
              <div className="space-y-4">
                 <div className="h-12 w-full bg-muted/30 rounded-lg animate-pulse" />
                 <div className="h-4 w-3/4 bg-muted/20 rounded-lg animate-pulse mx-auto" />
              </div>
            ) : status === 'success' ? (
              <Button className="w-full h-12 text-lg font-bold shadow-xl shadow-primary/20 gap-3">
                 Continue to Dashboard
                 <ArrowRight className="h-5 w-5" />
              </Button>
            ) : (
              <div className="space-y-4">
                 <Button className="w-full h-12 text-lg font-bold shadow-xl shadow-primary/20 gap-3">
                    <RefreshCw className="h-5 w-5" />
                    Request New Link
                 </Button>
                 <Button variant="ghost" className="w-full h-12 font-semibold">
                    Back to Login
                 </Button>
              </div>
            )}
         </div>
      </GlassCard>

      <div className="mt-8 flex items-center justify-center gap-6">
         <div className="flex flex-col items-center gap-1 opacity-40">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[8px] font-bold uppercase tracking-widest">SSL Secure</span>
         </div>
         <div className="flex flex-col items-center gap-1 opacity-40">
            <Lock className="h-5 w-5" />
            <span className="text-[8px] font-bold uppercase tracking-widest">End-to-End</span>
         </div>
         <div className="flex flex-col items-center gap-1 opacity-40">
            <Key className="h-5 w-5" />
            <span className="text-[8px] font-bold uppercase tracking-widest">RSA 2048</span>
         </div>
      </div>
    </div>
  );
};

export default VerifyShell;
