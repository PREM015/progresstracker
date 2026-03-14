"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Loader2, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";

interface ConnectedAccount {
  id: string;
  provider: string;
  email: string | null;
  image: string | null;
  createdAt: string;
}

const PROVIDER_ICONS: Record<string, string> = {
  google: "🔵",
  github: "⚫",
  facebook: "🔷",
  twitter: "🐦",
  discord: "💜",
  linkedin: "🔹",
};

const PROVIDER_NAMES: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  facebook: "Facebook",
  twitter: "Twitter / X",
  discord: "Discord",
  linkedin: "LinkedIn",
};

export default function ConnectedAccountsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        // The profile endpoint returns accounts/providers via the user data
        const accs: ConnectedAccount[] = (data.data?.accounts || []).map((a: any) => ({
          id: a.id,
          provider: a.provider,
          email: a.email || null,
          image: null,
          createdAt: a.createdAt || new Date().toISOString(),
        }));
        setAccounts(accs);
      })
      .catch((err) => console.error("Failed to load accounts", err))
      .finally(() => setLoading(false));
  }, []);

  const handleDisconnect = async (accountId: string, provider: string) => {
    setDisconnectingId(accountId);
    try {
      const res = await fetch(`/api/user/connected-accounts/${accountId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      toast.success(`${PROVIDER_NAMES[provider] || provider} disconnected`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to disconnect account");
    } finally {
      setDisconnectingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <GlassCard className="p-8 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link2 className="w-5 h-5 text-indigo-500" />
          <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">
            Connected Accounts
          </h3>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">OAuth</p>
      </div>

      <p className="text-sm text-zinc-500 font-medium -mt-4">
        Manage third-party accounts you've connected for sign-in.
      </p>

      {accounts.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Link2 className="w-7 h-7 text-zinc-300 dark:text-zinc-600" />
          </div>
          <div>
            <h4 className="font-bold text-zinc-900 dark:text-zinc-50">No connected accounts</h4>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              No OAuth providers connected to your account yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => {
            const providerKey = account.provider.toLowerCase();
            const icon = PROVIDER_ICONS[providerKey] || "🔗";
            const name = PROVIDER_NAMES[providerKey] || account.provider;
            return (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <div className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{name}</div>
                    {account.email && (
                      <div className="text-xs text-zinc-500 font-medium">{account.email}</div>
                    )}
                    <div className="text-[10px] text-zinc-400 font-medium">
                      Connected {new Date(account.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(account.id, providerKey)}
                  disabled={disconnectingId === account.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  {disconnectingId === account.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Unlink className="w-3 h-3" />
                  )}
                  Disconnect
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
          Connect More Providers
        </h4>
        <p className="text-xs text-zinc-500 font-medium mb-3">
          Additional OAuth providers can be connected via the sign-in page.
        </p>
        <div className="flex flex-wrap gap-2">
          {["Google", "GitHub", "Discord"].map((provider) => (
            <a
              key={provider}
              href={`/api/auth/signin/${provider.toLowerCase()}`}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <span>{PROVIDER_ICONS[provider.toLowerCase()]}</span>
              {provider}
            </a>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
