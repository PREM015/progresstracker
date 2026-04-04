'use client';

import React from 'react';
import { Cookie, Info, ShieldCheck, Settings, Trash, EyeOff, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const CookiePolicyPage = () => {
  return (
    <div className="space-y-12 py-12 px-6 max-w-5xl mx-auto text-foreground/80 leading-relaxed">
      <section className="text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600 dark:bg-amber-900/30 dark:text-amber-500">
           <Cookie className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Cookie <span className="text-amber-600 dark:text-amber-500 underline underline-offset-8">Policy</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Learn how we use cookies to provide a better, more secure, and personalized experience.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
         <GlassCard className="p-6 space-y-4 border-l-4 border-l-green-500">
            <div className="flex items-center gap-3">
               <ShieldCheck className="h-5 w-5 text-green-500" />
               <h3 className="font-bold text-lg">Your Privacy Control</h3>
            </div>
            <p className="text-sm">
               We believe you should have control over your data. You can manage your cookie preferences at any time through our settings panel.
            </p>
            <Button variant="outline" size="sm" className="gap-2 h-9">
               <Settings className="h-4 w-4" />
               Customize Preferences
            </Button>
         </GlassCard>

         <GlassCard className="p-6 space-y-4 border-l-4 border-l-amber-500 bg-amber-50/5 dark:bg-amber-900/5">
            <div className="flex items-center gap-3">
               <Info className="h-5 w-5 text-amber-500" />
               <h3 className="font-bold text-lg">What are Cookies?</h3>
            </div>
            <p className="text-sm">
               Cookies are small text files stored on your device that help websites remember information about your visit, like your preferred language or login status.
            </p>
            <Button variant="link" size="sm" className="p-0 h-auto text-amber-600 dark:text-amber-500 font-bold group">
               Learn more on Wikipedia
               <ExternalLink className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
         </GlassCard>
      </div>

      <div className="space-y-8 pt-8">
         <section className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
               <CheckCircle2 className="h-5 w-5 text-primary" />
               1. Categories of Cookies We Use
            </h2>
            <p className="text-sm">
               Progress Tracker uses several types of cookies to operate reliably and safely.
            </p>
            
            <div className="space-y-4 pt-4">
               {[
                 { type: 'Essential', icon: <Lock className="h-4 w-4" />, desc: 'Strictly necessary for the website to function. They allow you to log in, access secure areas, and use core features.' },
                 { type: 'Preference', icon: <Settings className="h-4 w-4" />, desc: 'Allow us to remember choices you make, such as your preferred language, theme (light/dark), and dashboard layout.' },
                 { type: 'Analytics', icon: <TrendingUp className="h-4 w-4" />, desc: 'Help us understand how visitors interact with our website by collecting and reporting information anonymously.' }
               ].map((c) => (
                 <div key={c.type} className="flex gap-4 p-4 rounded-xl border bg-muted/20">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0 border border-muted/50 text-primary">
                       {c.icon}
                    </div>
                    <div>
                       <h4 className="font-bold text-sm mb-1">{c.type} Cookies</h4>
                       <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                    </div>
                 </div>
               ))}
            </div>
         </section>

         <section className="space-y-4 pt-8">
            <h2 className="text-2xl font-bold">2. Specific Cookies Table</h2>
            <Table>
               <TableHeader className="bg-muted/50 text-xs font-bold uppercase">
                  <TableRow>
                     <TableHead className="w-[150px]">Name</TableHead>
                     <TableHead>Provider</TableHead>
                     <TableHead>Purpose</TableHead>
                     <TableHead className="text-right">Persistence</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody className="text-sm">
                  {[
                    { name: '__session', provider: 'Progress Tracker', purpose: 'Authentication & Session ID', expiry: 'Session' },
                    { name: 'theme_mode', provider: 'Progress Tracker', purpose: 'Stores Dark/Light preference', expiry: '1 Year' },
                    { name: '_ga', provider: 'Google Analytics', purpose: 'Anonymous session tracking', expiry: '2 Years' },
                    { name: 'stripe_mid', provider: 'Stripe', purpose: 'Fraud prevention for payments', expiry: '1 Year' }
                  ].map((row) => (
                    <TableRow key={row.name} className="hover:bg-muted/30 transition-colors border-muted/50">
                       <TableCell className="font-mono font-bold text-primary">{row.name}</TableCell>
                       <TableCell>{row.provider}</TableCell>
                       <TableCell className="text-muted-foreground">{row.purpose}</TableCell>
                       <TableCell className="text-right font-medium">{row.expiry}</TableCell>
                    </TableRow>
                  ))}
               </TableBody>
            </Table>
         </section>

         <section className="space-y-6 pt-12 border-t">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="space-y-2 text-center md:text-left">
                  <h2 className="text-2xl font-bold">Managing Cookies</h2>
                  <p className="text-sm max-w-xl">
                     Most web browsers allow you to control cookies through their settings. 
                     You can choose to block all cookies, but please note this will break our authentication system.
                  </p>
               </div>
               <div className="flex gap-3 shrink-0">
                  <Button variant="outline" className="gap-2">
                     <EyeOff className="h-4 w-4" />
                     Clear All
                  </Button>
                  <Button className="gap-2 px-8">
                     Settings
                  </Button>
               </div>
            </div>
            
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 flex gap-4">
               <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
               <p className="text-xs text-amber-800 dark:text-amber-500 leading-relaxed">
                  Blocking some types of cookies may impact your experience on our site and the services we are able to offer.
               </p>
            </div>
         </section>
      </div>
    </div>
  );
};

const TrendingUp = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
);

const Lock = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

export default CookiePolicyPage;
