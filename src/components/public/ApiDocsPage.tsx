'use client';

import React from 'react';
import { Terminal, Copy, Search, ShieldCheck, Zap, Globe, Cpu, Database, LayoutGrid, ChevronRight, Lock, Key, Server, Webhook, Box } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export const ApiDocsPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between py-4 max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight bg-primary/10 px-3 py-1 rounded border-primary/20 text-primary">API</h1>
            <span className="text-sm font-semibold hidden md:inline-block">API Reference v1.2</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative w-64 hidden md:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search endpoints..." className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:ring-primary" />
             </div>
             <Button variant="outline" size="sm" className="hidden sm:flex">Generate API Key</Button>
             <Button size="sm">Get Started</Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex container max-w-7xl mx-auto px-6">
        <aside className="hidden lg:block w-72 border-r pr-6 py-10 space-y-10 group overflow-y-auto max-h-[calc(100vh-64px)] scrollbar-thin">
           <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fundamentals</h3>
              <ul className="space-y-2 text-sm font-medium">
                 {['Introduction', 'Authentication', 'Errors', 'Pagination', 'Rate Limiting', 'Versioning'].map(i => (
                   <li key={i} className="text-muted-foreground hover:text-primary cursor-pointer transition-all flex items-center justify-between group/item">
                      <span>{i}</span>
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover/item:opacity-100 transition-all" />
                   </li>
                 ))}
              </ul>
           </section>

           <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resources</h3>
              <ul className="space-y-4 pt-2">
                 <li className="space-y-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                       <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                       Goals
                    </span>
                    <ul className="pl-6 space-y-2 text-xs text-muted-foreground">
                       <li className="hover:text-primary cursor-pointer flex items-center gap-2">
                          <Badge variant="outline" className="text-[8px] h-3 px-1 border-green-500/50 text-green-600 dark:text-green-400">GET</Badge>
                          List Goals
                       </li>
                       <li className="hover:text-primary cursor-pointer flex items-center gap-2">
                          <Badge variant="outline" className="text-[8px] h-3 px-1 border-blue-500/50 text-blue-600 dark:text-blue-500">POST</Badge>
                          Create Goal
                       </li>
                       <li className="hover:text-primary cursor-pointer flex items-center gap-2">
                          <Badge variant="outline" className="text-[8px] h-3 px-1 border-amber-500/50 text-amber-600 dark:text-amber-500">PATCH</Badge>
                          Update Goal
                       </li>
                    </ul>
                 </li>
                 <li className="space-y-2 opacity-60">
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                       <Zap className="h-3.5 w-3.5" />
                       Achievements
                    </span>
                 </li>
                 <li className="space-y-2 opacity-60">
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                       <Box className="h-3.5 w-3.5" />
                       Platforms
                    </span>
                 </li>
              </ul>
           </section>
        </aside>

        <main className="flex-1 py-10 lg:pl-10 space-y-16">
           <section id="intro" className="space-y-4">
              <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20">Production API v1</Badge>
              <h2 className="text-3xl font-extrabold tracking-tight">Introduction</h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed text-lg">
                 <p>
                    The Progress Tracker API is organized around REST. 
                    Our API has predictable resource-oriented URLs, accepts JSON-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes, authentication, and verbs.
                 </p>
              </div>
           </section>

           <section id="auth" className="space-y-8">
              <div className="flex items-center gap-3">
                 <Lock className="h-6 w-6 text-primary" />
                 <h2 className="text-2xl font-bold">Authentication</h2>
              </div>
              <p className="text-sm leading-relaxed max-w-2xl">
                 Authenticate your requests by including your secret API key in the <code>Authorization</code> header. 
                 Your API key carries significant privileges, so keep it secure! Do not share it in publicly accessible areas such as GitHub or client-side code.
              </p>
              
              <GlassCard className="bg-zinc-950 p-6 text-zinc-100 font-mono text-sm border-zinc-800 shadow-2xl relative group overflow-x-auto">
                 <div className="absolute top-4 right-4 flex gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase border-zinc-700 text-zinc-400">Bash</Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white transition-colors">
                       <Copy className="h-3 w-3" />
                    </Button>
                 </div>
                 <pre className="mt-4">
                    <code>
{`curl https://api.progresstracker.app/v1/goals \\
  -H "Authorization: Bearer YOUR_REST_API_KEY" \\
  -H "Content-Type: application/json"`}
                    </code>
                 </pre>
              </GlassCard>
           </section>

           <section id="endpoints" className="space-y-10">
              <div className="flex flex-col gap-4">
                 <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Server className="h-6 w-6 text-primary" />
                    List all goals
                 </h2>
                 <p className="text-sm text-muted-foreground">Returns a list of goals belonging to the authenticated account.</p>
              </div>

              <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
                 <div className="space-y-8">
                    <div className="space-y-4">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Parameters</h3>
                       <div className="space-y-4 border rounded-xl p-4 bg-muted/20">
                          {[
                            { name: 'limit', type: 'integer', desc: 'Maximum number of goals to return. (Default: 10)', required: false },
                            { name: 'status', type: 'string', desc: 'Filter goals by status (active, completed, archived).', required: false },
                            { name: 'platform', type: 'string', desc: 'Filter by platform slug (e.g. github, leetcode).', required: false }
                          ].map(p => (
                            <div key={p.name} className="flex flex-col gap-1 border-b last:border-0 pb-3 last:pb-0 pt-3 first:pt-0">
                               <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-primary">{p.name}</span>
                                  <span className="text-[10px] text-muted-foreground lowercase">{p.type}</span>
                                  {p.required && <Badge variant="destructive" className="text-[8px] h-3 px-1">Required</Badge>}
                               </div>
                               <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4 lg:sticky lg:top-24">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Response Body</h3>
                       <Badge variant="outline" className="text-[8px] h-3 px-1 border-green-500/50 text-green-600 dark:text-green-400">200 OK</Badge>
                    </div>
                    <GlassCard className="bg-zinc-950/90 backdrop-blur border-zinc-800 p-6 shadow-2xl overflow-hidden font-mono text-[11px] leading-relaxed">
                       <pre className="text-zinc-400">
{`{
  "object": "list",
  "url": "/v1/goals",
  "has_more": false,
  "data": [
    {
      "id": "goal_7vXqG2f",
      "title": "Build a Next.js App",
      "status": "active",
      "progress": 75,
      "platform": "github",
      "created_at": 1711782000
    }
  ]
}`}
                       </pre>
                    </GlassCard>
                 </div>
              </div>
           </section>
        </main>
      </div>

      <footer className="mt-20 border-t py-12 bg-muted/20">
         <div className="container max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlassCard className="p-6 space-y-4 hover:border-primary/40 transition-all border-primary/5 cursor-pointer">
               <Webhook className="h-6 w-6 text-primary" />
               <h4 className="font-bold">Webhooks</h4>
               <p className="text-xs text-muted-foreground leading-relaxed">Listen for events on your account so your system can automatically trigger reactions.</p>
            </GlassCard>
            <GlassCard className="p-6 space-y-4 hover:border-primary/40 transition-all border-primary/5 cursor-pointer">
               <Key className="h-6 w-6 text-amber-500" />
               <h4 className="font-bold">Key Management</h4>
               <p className="text-xs text-muted-foreground leading-relaxed">Learn how to create and rotate restricted API keys for specific workloads.</p>
            </GlassCard>
            <GlassCard className="p-6 space-y-4 hover:border-primary/40 transition-all border-primary/5 cursor-pointer">
               <FaGithub className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
               <h4 className="font-bold">Go SDK (Official)</h4>
               <p className="text-xs text-muted-foreground leading-relaxed">Our open-source toolkit for building powerful Go applications on top of our API.</p>
            </GlassCard>
         </div>
      </footer>
    </div>
  );
};

export default ApiDocsPage;
