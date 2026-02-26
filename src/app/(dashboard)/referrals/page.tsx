"use client";

import React, { useState, useEffect } from "react";
import {
  Users, Gift, Link as LinkIcon, Award, DollarSign,
  Copy, Check, ExternalLink, Activity
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

interface ReferralStatsData {
  totalReferrals: number;
  accepted: number;
  pending: number;
  rewards: number;
}

interface ReferralReward {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  points: number;
  unlocked: boolean;
}

interface Referral {
  id: string;
  email: string;
  status: "active" | "pending";
  signedUpAt?: string;
}

export default function ReferralsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStatsData | null>(null);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const fetchedStats: ReferralStatsData = {
        totalReferrals: 12,
        accepted: 8,
        pending: 4,
        rewards: 80,
      };

      const fetchedRewards: ReferralReward[] = [
        { id: "1", title: "First Referral", description: "Refer your first user", icon: <Gift className="w-5 h-5" />, points: 10, unlocked: true },
        { id: "2", title: "5 Referrals", description: "Refer 5 users", icon: <Award className="w-5 h-5" />, points: 50, unlocked: false },
      ];

      const fetchedReferrals: Referral[] = [
        { id: "1", email: "friend@example.com", status: "active", signedUpAt: "2024-02-01" },
        { id: "2", email: "buddy@example.com", status: "pending" },
      ];

      setStats(fetchedStats);
      setRewards(fetchedRewards);
      setReferrals(fetchedReferrals);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText("https://progresstracker.dev/ref/JOHNDOE123");
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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
            <div className="text-2xl font-bold text-white">{stats?.totalReferrals || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{stats?.accepted || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{stats?.pending || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Rewards Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-400">{stats?.rewards || 0} pts</div>
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
                  value="https://progresstracker.dev/ref/JOHNDOE123"
                  className="bg-black/40 border-zinc-800 text-sm h-10 flex-1 font-mono text-zinc-300"
                />
                <Button onClick={handleCopy} className={`${copiedCode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white transition-colors w-24`}>
                  {copiedCode ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedCode ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center">
                <Users className="w-5 h-5 mr-3 text-emerald-400" /> Your Referrals
              </CardTitle>
              <CardDescription>People who signed up using your link.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {referrals.length > 0 ? referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-medium">
                      {ref.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{ref.email}</p>
                      <p className="text-xs text-zinc-500">{ref.signedUpAt ? `Signed up on ${new Date(ref.signedUpAt).toLocaleDateString()}` : 'Invitation sent'}</p>
                    </div>
                  </div>
                  <Badge variant={ref.status === "active" ? "default" : "secondary"} className={ref.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}>
                    {ref.status === "active" ? "Active" : "Pending"}
                  </Badge>
                </div>
              )) : (
                <div className="text-center py-8 text-zinc-500">
                  <Users className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p>You haven't referred anyone yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-zinc-900/50 border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Award className="w-5 h-5 mr-3 text-amber-400" /> Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rewards.map((reward) => (
                <div key={reward.id} className={`p-4 rounded-xl border ${reward.unlocked ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/5 bg-black/20'} relative overflow-hidden group`}>
                  {reward.unlocked && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-500/20 to-transparent blur-2xl"></div>}
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg shrink-0 ${reward.unlocked ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-500'}`}>
                      {reward.icon}
                    </div>
                    <div>
                      <h4 className={`text-sm font-medium ${reward.unlocked ? 'text-white' : 'text-zinc-400'}`}>{reward.title}</h4>
                      <p className="text-xs text-zinc-500 mt-1">{reward.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-xs font-medium text-zinc-400">{reward.points} Points</span>
                    {reward.unlocked ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">Unlocked!</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-zinc-800 text-zinc-500 border-zinc-700">Locked</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
