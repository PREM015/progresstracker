import React from 'react';
import { ShieldAlert, Fingerprint, Database, UserCheck } from 'lucide-react';
import { MetaTags } from '@/components/seo/MetaTags';

export default function GDPRPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 space-y-12">
      <MetaTags title="GDPR Compliance" description="How we comply with the General Data Protection Regulation." />
      
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-white tracking-tight">GDPR Compliance</h1>
        <p className="text-zinc-400 text-lg">Your data rights under European law.</p>
      </div>

      <section className="space-y-8">
        <div className="prose prose-invert max-w-none">
          <p className="text-zinc-300 leading-relaxed text-lg">
            Progress Tracker is committed to being compliant with the General Data Protection Regulation (GDPR). Our priority is protecting our users' privacy and enabling them to have full control over their data.
          </p>

          <div className="grid grid-cols-1 gap-6 mt-12">
            <div className="p-8 rounded-3xl bg-zinc-900 border border-white/5 flex gap-6 items-start">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Right to Access</h3>
                <p className="text-zinc-400">You have the right to request a copy of the personal data we hold about you. You can export your data anytime from your settings.</p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-zinc-900 border border-white/5 flex gap-6 items-start">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Right to Erasure</h3>
                <p className="text-zinc-400">Also known as the "right to be forgotten". You can request that we delete all your personal data from our systems.</p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-zinc-900 border border-white/5 flex gap-6 items-start">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Fingerprint className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Data Portability</h3>
                <p className="text-zinc-400">We provide your data in a structured, commonly used, and machine-readable format to facilitate transfer to another service.</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-white mt-12">Data Sub-processors</h2>
          <p className="text-zinc-300 leading-relaxed">
            We use several carefully selected third-party services to help us provide Progress Tracker. All our sub-processors are vetted for GDPR compliance and have appropriate data processing agreements in place.
          </p>
          <ul className="list-disc pl-6 text-zinc-400 space-y-2 mt-4">
            <li>Vercel (Hosting & Infrastructure)</li>
            <li>Supabase (Database & Storage)</li>
            <li>Stripe (Payment Processing)</li>
            <li>Brevo (Email Communications)</li>
          </ul>
        </div>
      </section>

      <div className="pt-8 border-t border-white/5 text-center">
        <p className="text-zinc-500 text-sm">
          To exercise any of your rights or for more information, please contact our Data Protection Officer at dpo@progresstracker.dev
        </p>
      </div>
    </div>
  );
}
