'use client';

import React from 'react';
import { MessageSquare, ArrowLeft, Clock, CheckCircle2, User, Send, Paperclip, MoreHorizontal, ThumbsUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

export const FeedbackDetail = () => {
  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
             <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">Resolved</Badge>
             <span className="text-xs text-muted-foreground">#FB-1284</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight line-clamp-1">Dark mode contrast improvements</h1>
        </div>
        <Button variant="outline" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    JD
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">John Doe</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                       <Clock className="h-3 w-3" /> 2 days ago
                    </p>
                  </div>
               </div>
               <Badge variant="secondary">Reporter</Badge>
            </div>
            
            <div className="prose prose-sm dark:prose-invert max-w-none py-4">
               <p className="text-sm leading-relaxed text-foreground/80">
                 The current dark mode has some contrast issues on the dashboard widgets, specifically the activity trend chart labels. 
                 It's difficult to read against the glass background in some lighting conditions. 
                 Could we increase the contrast by 10-15%?
               </p>
               <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-dashed flex items-center gap-4 group cursor-pointer hover:border-primary/40 transition-all">
                  <div className="w-12 h-12 bg-background flex items-center justify-center rounded shadow-sm">
                    <Paperclip className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">screenshot_issue_01.png</p>
                    <p className="text-[10px] text-muted-foreground">420 KB • PNG Image</p>
                  </div>
               </div>
            </div>
            
            <div className="flex items-center gap-4 pt-4 border-t">
               <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                 <ThumbsUp className="h-4 w-4" />
                 Like
               </Button>
               <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                 <MessageSquare className="h-4 w-4" />
                 Reply
               </Button>
            </div>
          </GlassCard>

          <div className="space-y-4 pl-4 lg:pl-12 relative">
             <div className="absolute left-0 top-0 bottom-0 w-px bg-muted ml-6 lg:ml-14" />
             
             {[
               { user: 'Support Bot', text: 'Thank you for your feedback! We have logged this with our UI team.', date: '2 days ago', isBot: true },
               { user: 'Sarah Miller', text: 'I have updated the contrast ratios. This will be included in the next release.', date: 'Yesterday', isStaff: true }
             ].map((reply, i) => (
               <div key={i} className="relative z-10 flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold border-2 ${
                    reply.isBot ? 'bg-blue-500 text-white border-blue-600' : 
                    reply.isStaff ? 'bg-amber-500 text-white border-amber-600' : 
                    'bg-primary/10 text-primary border-primary/20'
                  }`}>
                    {reply.user[0]}
                  </div>
                  <GlassCard className="flex-1 p-4 space-y-2 bg-background/50 backdrop-blur-sm">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{reply.user}</span>
                          {reply.isStaff && <Badge className="text-[10px] h-4 bg-amber-500 hover:bg-amber-600">Staff</Badge>}
                          {reply.isBot && <Badge className="text-[10px] h-4 bg-blue-500 hover:bg-blue-600">Bot</Badge>}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{reply.date}</span>
                     </div>
                     <p className="text-sm text-foreground/80">{reply.text}</p>
                  </GlassCard>
               </div>
             ))}
          </div>

          <GlassCard className="p-6 space-y-4 shadow-lg border-primary/20">
             <div className="flex items-center gap-2 font-semibold">
                <Send className="h-4 w-4 text-primary" />
                Add a Comment
             </div>
             <Textarea 
               placeholder="Write your response here..." 
               className="min-h-[120px] bg-background/50 resize-none border-primary/10 focus-visible:ring-primary"
             />
             <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attach Files
                </Button>
                <Button className="gap-2 px-6">
                  Post Comment
                </Button>
             </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
           <GlassCard className="p-6 space-y-6 bg-primary/5 border-primary/20">
              <h3 className="font-semibold pb-4 border-b">Submission Info</h3>
              
              <div className="grid gap-4 text-sm">
                 <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Priority</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">High</Badge>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">UI/UX</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Platform</span>
                    <span className="font-medium">Desktop Web</span>
                 </div>
                 <div className="flex items-center justify-between text-xs pt-4 border-t">
                    <span className="text-muted-foreground">Viewed by team</span>
                    <div className="flex -space-x-2">
                       {[1, 2, 3].map(i => (
                         <div key={i} className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                           {String.fromCharCode(64 + i)}
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </GlassCard>

           <GlassCard className="p-6 space-y-4 opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
              <h3 className="font-semibold">Related Feedback</h3>
              <ul className="space-y-3">
                 <li className="text-sm font-medium hover:text-primary transition-colors cursor-pointer group flex items-start gap-2">
                   <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                   <span className="line-clamp-2">Contrast ratio for the sidebar icons too low</span>
                 </li>
                 <li className="text-sm font-medium hover:text-primary transition-colors cursor-pointer group flex items-start gap-2">
                   <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                   <span className="line-clamp-2">Font size on mobile is slightly small</span>
                 </li>
              </ul>
           </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default FeedbackDetail;
