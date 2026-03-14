"use client";

import { useState, useEffect } from "react";
import { ApiKeyForm, ApiKeyList } from "@/components/api-keys";
import { GlassCard } from "@/components/ui/GlassCard";
import { Key, Plus } from "lucide-react";
import { toast } from "sonner";

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKey, setShowNewKey] = useState(false);

  useEffect(() => {
    fetch("/api/user/api-keys")
      .then((r) => r.json())
      .then((data) => setApiKeys(data.data?.keys || data.keys || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const createApiKey = async (name: string) => {
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to create key");
      setApiKeys((prev) => [...prev, data.data?.key || data.key]);
      setShowNewKey(false);
      toast.success("API key created");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create API key");
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const res = await fetch(`/api/user/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete key");
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("API key deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete API key");
    }
  };

  return (
    <GlassCard className="p-8 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="w-5 h-5 text-indigo-500" />
          <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">
            API Keys
          </h3>
        </div>
        {!showNewKey && (
          <button
            onClick={() => setShowNewKey(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Key
          </button>
        )}
      </div>

      {showNewKey && (
        <ApiKeyForm onCreate={createApiKey} onCancel={() => setShowNewKey(false)} />
      )}

      <ApiKeyList keys={apiKeys} onDelete={deleteApiKey} isLoading={loading} />
    </GlassCard>
  );
}
