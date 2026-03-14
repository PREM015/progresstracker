"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Mail, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function EmailChangePage() {
  const { data: session } = useSession();
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const currentEmail = session?.user?.email || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail || !confirmEmail || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (newEmail !== confirmEmail) {
      toast.error("Email addresses do not match");
      return;
    }
    if (newEmail === currentEmail) {
      toast.error("New email must be different from current email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/settings/email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Failed to request email change");
      }

      setSuccess(true);
      setNewEmail("");
      setConfirmEmail("");
      setPassword("");
      toast.success("Verification emails sent! Check both your current and new inbox.");
    } catch (err: any) {
      toast.error(err?.message || "Email change failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm";
  const labelClass =
    "block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 pl-1";

  return (
    <GlassCard className="p-8 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-indigo-500" />
          <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">
            Change Email Address
          </h3>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Security</p>
      </div>

      {success ? (
        <div className="flex flex-col items-center text-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-emerald-500" />
          </div>
          <h4 className="font-bold text-zinc-900 dark:text-zinc-50">Verification Emails Sent</h4>
          <p className="text-sm text-zinc-500 font-medium max-w-sm">
            We've sent verification links to both your current and new email address.
            Please check both inboxes to complete the change.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="text-indigo-500 text-xs font-bold uppercase tracking-widest hover:text-indigo-600"
          >
            Request Another Change
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current email (read-only) */}
          <div className="space-y-1">
            <label className={labelClass}>Current Email</label>
            <input
              type="email"
              value={currentEmail}
              disabled
              className={`${inputClass} opacity-60 cursor-not-allowed`}
            />
          </div>

          {/* New email */}
          <div className="space-y-1">
            <label htmlFor="new-email" className={labelClass}>New Email Address</label>
            <input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="enter@newemail.com"
              className={inputClass}
              required
            />
          </div>

          {/* Confirm new email */}
          <div className="space-y-1">
            <label htmlFor="confirm-email" className={labelClass}>Confirm New Email</label>
            <input
              id="confirm-email"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="confirm@newemail.com"
              className={inputClass}
              required
            />
            {confirmEmail && newEmail !== confirmEmail && (
              <p className="text-xs text-red-500 font-medium pl-1 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" /> Emails do not match
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label htmlFor="password" className={labelClass}>Current Password (to confirm)</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
              required
            />
          </div>

          {/* Info callout */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-xl">
            <h5 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">
              How it works
            </h5>
            <ul className="text-xs text-zinc-500 dark:text-zinc-400 font-medium space-y-1">
              <li>• Verification emails will be sent to both addresses</li>
              <li>• You must verify both to complete the change</li>
              <li>• Your login credentials will update automatically</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !newEmail || !confirmEmail || !password || newEmail !== confirmEmail}
              className="flex-1 h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Sending..." : "Request Email Change"}
            </button>
          </div>
        </form>
      )}
    </GlassCard>
  );
}
