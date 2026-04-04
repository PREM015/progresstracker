'use client';

import React, { useState } from 'react';
import { Mail, Bell,  Zap, Rocket, Save, CheckCircle2,Settings, MailCheck, Globe, Info } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

import { Badge } from '@/components/ui/badge';
import { RefreshCw } from "lucide-react";
export const NewsletterPreferences = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveComplete(true);
      setTimeout(() => setSaveComplete(false), 3000);
    }, 1500);
  };

  return (
    <div className="space-y-12 py-12 px-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section className="text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto border-2 border-primary/20">
           <MailCheck className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Email <span className="text-primary underline underline-offset-8 decoration-primary/20">Preferences</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed italic">
          Control how and when you hear from us. Stay informed without the noise.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
         <aside className="lg:col-span-1 space-y-6">
            <GlassCard className="p-6 space-y-4 bg-primary/5 border-primary/20">
               <h3 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Quick Stats
               </h3>
               <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                     <span className="text-muted-foreground">Status</span>
                     <Badge variant="outline" className="h-4 border-green-500/50 text-green-600 dark:text-green-500 bg-green-500/5">Subscribed</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                     <span className="text-muted-foreground">Joined</span>
                     <span className="font-mono font-bold italic">Oct 2024</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                     <span className="text-muted-foreground">Campaigns</span>
                     <span className="font-mono font-bold italic">3 Active</span>
                  </div>
               </div>
            </GlassCard>

            <div className="p-4 rounded-xl bg-muted/20 border-2 border-dashed flex flex-col items-center text-center space-y-3 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
               <Globe className="h-6 w-6 text-muted-foreground" />
               <p className="text-[10px] leading-relaxed italic">
                  Change your global delivery location for time-sensitive alerts.
               </p>
            </div>
         </aside>

         <main className="lg:col-span-3 space-y-8">
            <GlassCard className="p-8 space-y-8 shadow-2xl border-primary/5 bg-background/50 backdrop-blur-3xl">
               <div className="space-y-6">
                  <div className="pb-4 border-b">
                     <h3 className="text-xl font-bold tracking-tight">Campaign Subscriptions</h3>
                     <p className="text-sm text-muted-foreground italic">Toggle the types of emails you&apos;d like to receive from our team.</p>
                  </div>
                  
                  {[
                    { id: 'daily', title: 'Daily Progress Digest', desc: 'A morning summary of your previous day accomplishments and upcoming goals.', icon: <Zap className="h-5 w-5 text-amber-500" /> },
                    { id: 'weekly', title: 'Weekly Insight Report', desc: 'Detailed velocity charts and team-based performance benchmarks every Monday.', icon: <Rocket className="h-5 w-5 text-purple-500" /> },
                    { id: 'product', title: 'Product & Feature Updates', desc: 'Be the first to know about new integrations and beta testing opportunities.', icon: <Mail className="h-5 w-5 text-blue-500" /> }
                  ].map((c) => (
                    <div key={c.id} className="flex items-center justify-between group p-4 rounded-xl hover:bg-muted/30 transition-all border border-transparent hover:border-primary/10">
                       <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0 border border-muted/50 group-hover:scale-110 group-hover:bg-primary/5 transition-all">
                             {c.icon}
                          </div>
                          <div className="space-y-1">
                             <h4 className="font-bold text-sm tracking-tight">{c.title}</h4>
                             <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">{c.desc}</p>
                          </div>
                       </div>
                       <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                    </div>
                  ))}
               </div>

               <div className="space-y-6 pt-6 border-t">
                  <div className="pb-4">
                     <h3 className="text-xl font-bold tracking-tight">Notification Channels</h3>
                     <p className="text-sm text-muted-foreground italic">How should we reach you for high-priority alerts?</p>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                     <div className="flex items-center space-x-3 p-4 rounded-xl border-2 border-primary/10 bg-primary/5 group cursor-pointer hover:bg-primary/10 transition-all">
                        <Checkbox id="email" defaultChecked />
                        <label htmlFor="email" className="text-sm font-bold flex items-center gap-2 cursor-pointer">
                           <Mail className="h-4 w-4 text-primary" />
                           Email
                        </label>
                     </div>
                     <div className="flex items-center space-x-3 p-4 rounded-xl border-2 border-muted bg-muted/20 group cursor-not-allowed opacity-50">
                        <Checkbox id="push" disabled />
                        <label htmlFor="push" className="text-sm font-bold flex items-center gap-2">
                           <Bell className="h-4 w-4" />
                           Push (Coming Soon)
                        </label>
                     </div>
                  </div>
               </div>
               
               <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-dashed border-primary/20">
                  <p className="text-[11px] leading-relaxed text-muted-foreground max-w-xs text-center sm:text-left italic">
                     By clicking save, you confirm that you want to update your delivery preferences immediately. You can change these at any time.
                  </p>
                  <Button 
                    className="h-12 px-10 text-lg font-bold shadow-2xl shadow-primary/20 gap-3 group overflow-hidden relative" 
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : saveComplete ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 group-hover:-translate-y-0.5 transition-transform" />
                        Save Preferences
                      </>
                    )}
                  </Button>
               </div>
            </GlassCard>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 flex gap-4">
               <Info className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
               <p className="text-[11px] text-amber-800 dark:text-amber-500 leading-relaxed italic">
                  Critical system notifications, security alerts, and billing invoices cannot be disabled. 
                  These are essential for the operation of your account and legal compliance.
               </p>
            </div>
         </main>
      </div>

      <div className="pt-20 text-center space-y-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer group">
         <Badge variant="outline" className="h-6 border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/5 group-hover:bg-red-500/10 transition-colors">
            Unsubscribe All
         </Badge>
         <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Looking to pause all non-essential communications permanently?
         </p>
      </div>
    </div>
  );
};

export default NewsletterPreferences;
