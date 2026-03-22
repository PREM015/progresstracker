"use client";

import React, { useState } from "react";
import { useReferral } from '@/hooks';
import { 
  Gift, 
  Award, 
  Share2, 
  Copy, 
  CheckCircle, 
  Users, 
  ArrowRight, 
  Zap,
  Check,
  Link as LinkIcon
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ReferralsPage() {
  const { code, stats: referralStats, isLoading } = useReferral();
  const [copiedCode, setCopiedCode] = useState(false);

  // Mock data for rewards and referrals list (until backend endpoints exist)
  const rewards = [
    { id: "1", title: "First Referral", description: "Refer your first user", icon: <Gift className="w-5 h-5" />, points: 10, unlocked: true },
    { id: "2", title: "5 Referrals", description: "Refer 5 users", icon: <Award className="w-5 h-5" />, points: 50, unlocked: false },
  ];

  const referrals = [
    { id: "1", email: "friend@example.com", status: "active", signedUpAt: "2024-02-01" },
    { id: "2", email: "buddy@example.com", status: "pending" },
  ];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (code?.code) {
      const url = `https://progresstracker.dev/ref/${code.code}`;
      navigator.clipboard.writeText(url);
      setCopiedCode(true);
      toast.success("Referral link copied to clipboard");
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      toast.error("No referral code available");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 lg:p-8 space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-48 mb-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Referral Program</h1>
          <p className="text-zinc-400 max-w-2xl">
            Invite your friends to use Progress Tracker and earn exclusive rewards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300">
            Rules & FAQ
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{referralStats?.totalReferrals || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{referralStats?.completedReferrals || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{referralStats?.pendingReferrals || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Rewards Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-400">{referralStats?.totalRewardsEarned || 0} pts</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-zinc-900/50 border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center">
                <LinkIcon className="w-5 h-5 mr-3 text-indigo-400" /> Your Referral Link
              </CardTitle>
              <CardDescription>Share this link to invite users.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Input
                  readOnly
                  value={code?.code ? `https://progresstracker.dev/ref/${code.code}` : "Generating code..."}
                  className="bg-black/40 border-zinc-800 text-sm h-10 flex-1 font-mono text-zinc-300"
                />
                <Button 
                    onClick={handleCopy} 
                    className={`${copiedCode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white transition-colors w-24`}
                    disabled={!code?.code}
                >
                  {copiedCode ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedCode ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Users className="w-5 h-5 mr-3 text-indigo-400" /> Recent Referrals
              </CardTitle>
              <CardDescription>View your friends who have signed up.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {referrals.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 uppercase">
                        {ref.email[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{ref.email}</div>
                        <div className="text-xs text-zinc-500">
                          {ref.signedUpAt ? `Joined ${ref.signedUpAt}` : 'Signed up today'}
                        </div>
                      </div>
                    </div>
                    <Badge variant={ref.status === 'active' ? 'default' : 'secondary'} className={ref.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-zinc-800 text-zinc-400'}>
                      {ref.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-zinc-400 hover:text-white group">
                View All Referrals <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-zinc-900/50 border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Award className="w-5 h-5 mr-3 text-amber-400" /> Milestones
              </CardTitle>
              <CardDescription>Unlock rewards as you refer more users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {rewards.map((reward) => (
                <div key={reward.id} className={`relative flex items-start gap-4 p-4 rounded-xl border ${reward.unlocked ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-transparent border-white/5 opacity-60'}`}>
                  <div className={`p-2 rounded-lg ${reward.unlocked ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {reward.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-white">{reward.title}</h4>
                      {reward.unlocked && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-xs text-zinc-400 mb-2">{reward.description}</p>
                    <div className="flex items-center gap-2">
                       <Zap className="w-3 h-3 text-amber-400" />
                       <span className="text-xs font-mono text-amber-400">+{reward.points} Points</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-indigo-600 border-none overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                <Share2 className="w-32 h-32 text-white/10 rotate-12" />
             </div>
             <CardContent className="p-6 relative z-10">
                <h3 className="text-xl font-bold text-white mb-2">Spread the Word</h3>
                <p className="text-indigo-100/80 text-sm mb-6">
                  Know someone who'd love Progress Tracker? Give them your link and earn rewards together!
                </p>
                <Button className="w-full bg-white text-indigo-600 hover:bg-zinc-100 font-bold" onClick={handleCopy}>
                  Share Now
                </Button>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
