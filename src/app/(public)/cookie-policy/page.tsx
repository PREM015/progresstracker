import React from 'react';
import { Shield, Lock, Eye, FileText } from 'lucide-react';
import { MetaTags } from '@/components/seo/MetaTags';

export default function CookiePolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 space-y-12">
      <MetaTags title="Cookie Policy" description="Learn how we use cookies to improve your experience." />
      
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-white tracking-tight">Cookie Policy</h1>
        <p className="text-zinc-400 text-lg">Last updated: March 2024</p>
      </div>

      <section className="space-y-6">
        <div className="prose prose-invert max-w-none">
          <p className="text-zinc-300 leading-relaxed">
            This Cookie Policy explains how Progress Tracker ("we", "us", and "our") uses cookies and similar technologies to recognize you when you visit our website at progresstracker.dev. It explains what these technologies are and why we use them, as well as your rights to control our use of them.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">What are cookies?</h2>
          <p className="text-zinc-300 leading-relaxed">
            Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-8">Why do we use cookies?</h2>
          <p className="text-zinc-300 leading-relaxed">
            We use first-party and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our Website to operate, and we refer to these as "essential" or "strictly necessary" cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our Online Sections.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-white">Essential Cookies</h3>
              <p className="text-sm text-zinc-400">Strictly necessary to provide you with services available through our Website and to use some of its features, such as access to secure areas.</p>
            </div>
            <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-white">Analytics Cookies</h3>
              <p className="text-sm text-zinc-400">These cookies collect information that is used either in aggregate form to help us understand how our Website is being used.</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-white mt-8">How can I control cookies?</h2>
          <p className="text-zinc-300 leading-relaxed">
            You have the right to decide whether to accept or reject cookies. You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted.
          </p>
        </div>
      </section>

      <div className="pt-8 border-t border-white/5">
        <p className="text-zinc-500 text-sm">
          If you have any questions about our use of cookies or other technologies, please email us at privacy@progresstracker.dev
        </p>
      </div>
    </div>
  );
}
