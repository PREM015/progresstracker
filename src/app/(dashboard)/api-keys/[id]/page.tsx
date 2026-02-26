"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Key, Clock, Shield, Globe, MapPin, 
  Activity, Calendar, ArrowLeft, Loader2, 
  Trash2, Edit, AlertTriangle
} from "lucide-react";

// Helper components (assuming they are standard shadcn-like)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ApiKeyDetails {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  rateLimitWindow: number;
  allowedIps: string[];
  allowedOrigins: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  usageCount: number;
  usageCountDaily: number;
  usageResetAt: string | null;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
}

export default function ApiKeyDetailPage({ params }: any) {
  const router = useRouter();
  const id = params?.id;

  const [apiKey, setApiKey] = useState<ApiKeyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchApiKey = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/api-keys/${id}`);
        const json = await res.json();
        
        if (!json.success) {
          throw new Error(json.message || "Failed to fetch API key");
        }
        
        setApiKey(json.data);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchApiKey();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in p-6 lg:p-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !apiKey) {
    return (
      <div className="p-8 text-center bg-red-500/[0.06] border border-red-500/20 rounded-2xl m-6">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Error Loading API Key</h3>
        <p className="text-zinc-400 mb-6">{error || "API Key not found."}</p>
        <Button onClick={() => router.push("/api-keys")} variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10">
          Return to API Keys
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <button 
            onClick={() => router.push("/api-keys")}
            className="flex items-center text-sm text-zinc-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to API Keys
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">{apiKey.name}</h1>
            <Badge variant={apiKey.isActive ? "default" : "secondary"} className={apiKey.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400"}>
              {apiKey.isActive ? "Active" : "Inactive"}
            </Badge>
            {apiKey.isExpired && (
              <Badge variant="destructive" className="bg-red-500/10 text-red-400 border border-red-500/20">
                Expired
              </Badge>
            )}
          </div>
          {apiKey.description && (
            <p className="text-zinc-400 mt-2 max-w-2xl">{apiKey.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800">
            <Edit className="w-4 h-4 mr-2" /> Edit Key
          </Button>
          <Button variant="destructive" className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-sm">
            <Trash2 className="w-4 h-4 mr-2" /> Revoke
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-zinc-900/50 border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Key className="w-5 h-5 mr-3 text-indigo-400" /> Key Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-black/20">
                <div>
                  <p className="text-sm font-medium text-zinc-500 mb-1">Prefix</p>
                  <p className="font-mono text-zinc-300">{apiKey.keyPrefix}••••••••</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500 mb-1">Created</p>
                  <div className="flex items-center text-zinc-300">
                    <Calendar className="w-4 h-4 mr-2 text-zinc-500" />
                    {new Date(apiKey.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500 mb-1">Expires</p>
                  <div className="flex items-center text-zinc-300">
                    <Clock className="w-4 h-4 mr-2 text-zinc-500" />
                    {apiKey.expiresAt ? new Date(apiKey.expiresAt).toLocaleDateString() : "Never"}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500 mb-1">Last Updated</p>
                  <div className="flex items-center text-zinc-300">
                    <Clock className="w-4 h-4 mr-2 text-zinc-500" />
                    {new Date(apiKey.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-zinc-500 mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2" /> Permissions (Scopes)
                </p>
                <div className="flex flex-wrap gap-2">
                  {apiKey.scopes.map(scope => (
                    <Badge key={scope} variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 capitalize">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Shield className="w-5 h-5 mr-3 text-emerald-400" /> Security Restrictions
              </CardTitle>
              <CardDescription>Network restrictions applied to this API key.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm font-medium text-zinc-500 mb-3 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" /> Allowed IP Addresses
                </p>
                {apiKey.allowedIps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {apiKey.allowedIps.map(ip => (
                      <Badge key={ip} variant="secondary" className="font-mono bg-zinc-800 text-zinc-300">
                        {ip}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 italic">No IP restrictions (Any IP allowed)</p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-zinc-500 mb-3 flex items-center">
                  <Globe className="w-4 h-4 mr-2" /> Allowed Origins (CORS)
                </p>
                {apiKey.allowedOrigins.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {apiKey.allowedOrigins.map(origin => (
                      <Badge key={origin} variant="secondary" className="font-mono bg-zinc-800 text-zinc-300">
                        {origin}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 italic">No Origin restrictions (Any Origin allowed)</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Usage */}
        <div className="space-y-6">
          <Card className="bg-zinc-900/50 border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Activity className="w-5 h-5 mr-3 text-orange-400" /> Usage Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-black/20 p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-zinc-400 text-sm">Total Uses</span>
                  <span className="font-mono text-xl text-white font-semibold">
                    {apiKey.usageCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-zinc-400 text-sm">Today's Uses</span>
                  <div className="text-right">
                    <span className="font-mono text-xl text-white font-semibold">
                      {apiKey.usageCountDaily.toLocaleString()}
                    </span>
                    <p className="text-xs text-zinc-500 mt-1">
                      Resets {apiKey.usageResetAt ? new Date(apiKey.usageResetAt).toLocaleTimeString() : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Rate Limit</span>
                  <span className="font-mono text-white text-sm">
                    {apiKey.rateLimit} req / {apiKey.rateLimitWindow}s
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-zinc-500 mb-2">Last Activity</p>
                {apiKey.lastUsedAt ? (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-zinc-300">
                      <Clock className="w-4 h-4 mr-2 text-zinc-500" />
                      {new Date(apiKey.lastUsedAt).toLocaleString()}
                    </div>
                    {apiKey.lastUsedIp && (
                      <div className="flex items-center text-sm text-zinc-400">
                        <MapPin className="w-4 h-4 mr-2 text-zinc-600" />
                        IP: <span className="font-mono ml-1">{apiKey.lastUsedIp}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 italic">Never used</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
