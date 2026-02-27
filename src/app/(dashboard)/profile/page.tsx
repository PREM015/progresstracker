"use client";

import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ShieldAlert, Award, Target, ExternalLink } from "lucide-react";
import type { UserProfileResponse } from "@/services/userService";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          setProfile(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  const displayName = profile?.name || session?.user?.name || "User";
  const email = profile?.email || session?.user?.email;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-300 dark:to-zinc-500">
          Account Profile
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Manage your public presence and account security.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="glass-card p-8 flex flex-col items-center text-center space-y-6">
            <div className="relative group p-1 rounded-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 transition-colors duration-500">
              <Avatar className="h-32 w-32 border-4 border-white dark:border-zinc-900 shadow-2xl">
                <AvatarImage src={profile?.image || session?.user?.image || ""} />
                <AvatarFallback className="text-3xl font-bold bg-zinc-100 dark:bg-zinc-800">{displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center transition-opacity cursor-pointer">
                <span className="text-white text-xs font-bold uppercase tracking-widest">Change</span>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{displayName}</h2>
              <p className="text-sm text-zinc-500 font-medium mt-1 uppercase tracking-wider">{email}</p>
            </div>
            <div className="w-full pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-center gap-4">
              <div className="text-center group cursor-pointer">
                <div className="text-lg font-bold flex items-center justify-center gap-1">
                  <Target className="w-3 h-3 text-indigo-500" />
                  {profile?.goalsCount ?? 0}
                </div>
                <div className="text-[10px] uppercase font-black text-zinc-400 group-hover:text-indigo-400 transition-colors">Goals</div>
              </div>
              <div className="w-px h-8 bg-zinc-100 dark:bg-zinc-800" />
              <div className="text-center group cursor-pointer">
                <div className="text-lg font-bold flex items-center justify-center gap-1">
                  <Award className="w-3 h-3 text-amber-500" />
                  {profile?.achievementsCount ?? 0}
                </div>
                <div className="text-[10px] uppercase font-black text-zinc-400 group-hover:text-amber-400 transition-colors">Badges</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-lg tracking-tight">Personal Details</h3>
              <p className="text-xs text-zinc-500 font-medium mt-1">This information is shared across connected platforms.</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-zinc-400">Display Name</Label>
                  <Input id="name" defaultValue={displayName} className="bg-transparent border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 rounded-xl font-medium" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-zinc-400">Email Address</Label>
                  <Input id="email" type="email" defaultValue={email || ""} disabled className="bg-zinc-50 dark:bg-zinc-950/50 border-zinc-100 dark:border-zinc-800/50 rounded-xl font-medium cursor-not-allowed opacity-70" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs font-black uppercase tracking-widest text-zinc-400">Username</Label>
                  <Input id="username" defaultValue={profile?.username || ""} className="bg-transparent border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 rounded-xl font-medium" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-xs font-black uppercase tracking-widest text-zinc-400">Location</Label>
                  <Input id="location" defaultValue={profile?.location || ""} placeholder="City, Country" className="bg-transparent border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 rounded-xl font-medium" />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl px-8 hover:scale-[1.02] transition-transform font-bold">Save Changes</Button>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg tracking-tight">Quick Security</h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">Manage your account access and keys.</p>
              </div>
              <Button variant="ghost" asChild className="text-xs font-bold uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg group">
                <a href="/settings/security" className="flex items-center gap-2">
                  Manage Safe
                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </Button>
            </div>
            <div className="p-8 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${profile?.twoFactorEnabled ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10'}`}>
                  {profile?.twoFactorEnabled ? (
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-rose-500" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold">2-Factor Authentication</div>
                  <div className={`text-[10px] font-black uppercase tracking-widest ${profile?.twoFactorEnabled ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {profile?.twoFactorEnabled ? 'Active & Protected' : 'Highly Recommended'}
                  </div>
                </div>
              </div>
              <Button
                variant={profile?.twoFactorEnabled ? "outline" : "default"}
                className={`rounded-xl font-bold text-xs h-9 px-4 ${!profile?.twoFactorEnabled && 'bg-rose-500 hover:bg-rose-600 text-white border-none'}`}
              >
                {profile?.twoFactorEnabled ? 'Disable' : 'Enable Now'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
