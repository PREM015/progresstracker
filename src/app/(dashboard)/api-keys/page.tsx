"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Key, Plus, Search, MoreVertical,
    Clock, Shield, Trash2, Edit,
    AlertTriangle, Check, Copy, ExternalLink
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface ApiKeyBasic {
    id: string;
    name: string;
    keyPrefix: string;
    isActive: boolean;
    createdAt: string;
    lastUsedAt: string | null;
}

export default function ApiKeysPage() {
    const router = useRouter();
    const [apiKeys, setApiKeys] = useState<ApiKeyBasic[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        // In a real implementation, this would fetch from /api/api-keys
        const mockKeys: ApiKeyBasic[] = [
            {
                id: "key_1",
                name: "Production App",
                keyPrefix: "pk_prod_1a2b",
                isActive: true,
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
                id: "key_2",
                name: "Development environment",
                keyPrefix: "pk_test_9z8y",
                isActive: true,
                createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                lastUsedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: "key_3",
                name: "Legacy Integration",
                keyPrefix: "pk_live_7x6w",
                isActive: false,
                createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
                lastUsedAt: null
            }
        ];

        setTimeout(() => {
            setApiKeys(mockKeys);
            setLoading(false);
        }, 800);
    }, []);

    const handleCopy = (e: React.MouseEvent, prefix: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`${prefix}••••••••`);
        setCopiedId(prefix);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredKeys = apiKeys.filter(key =>
        key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        key.keyPrefix.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen p-6 lg:p-8 space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">API Keys</h1>
                    <p className="text-zinc-400 max-w-2xl">
                        Manage your API keys for accessing the developer API. Keep your keys secure and never share them publicly.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300">
                        <ExternalLink className="w-4 h-4 mr-2" /> Documentation
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Create New Key
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main List */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-zinc-900/50 border-white/5">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Your Rest API Keys</CardTitle>
                                    <CardDescription>You have {apiKeys.filter(k => k.isActive).length} active keys</CardDescription>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <Input
                                        placeholder="Search keys..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 bg-black/40 border-zinc-800 text-sm h-9"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? (
                                // Loading Skeletons
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/20">
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div>
                                                <Skeleton className="h-5 w-32 mb-2" />
                                                <Skeleton className="h-4 w-48" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </div>
                                ))
                            ) : filteredKeys.length > 0 ? (
                                filteredKeys.map((apiKey) => (
                                    <div
                                        key={apiKey.id}
                                        onClick={() => router.push(`/api-keys/${apiKey.id}`)}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/5 bg-black/20 hover:bg-white/[0.02] hover:border-white/10 transition-all cursor-pointer group gap-4 sm:gap-0"
                                    >
                                        <div className="flex items-start sm:items-center gap-4">
                                            <div className={`p-2.5 rounded-lg shrink-0 ${apiKey.isActive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                <Key className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-medium text-white group-hover:text-indigo-300 transition-colors">
                                                        {apiKey.name}
                                                    </h3>
                                                    {apiKey.isActive ? (
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active"></span>
                                                    ) : (
                                                        <span className="w-2 h-2 rounded-full bg-zinc-600" title="Inactive"></span>
                                                    )}
                                                </div>
                                                <div className="flex items-center text-sm text-zinc-500 font-mono">
                                                    {apiKey.keyPrefix}••••••••
                                                    <button
                                                        onClick={(e) => handleCopy(e, apiKey.keyPrefix)}
                                                        className="ml-2 hover:text-white transition-colors"
                                                        title="Copy prefix"
                                                    >
                                                        {copiedId === apiKey.keyPrefix ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                                            <div className="flex flex-col items-start sm:items-end text-sm text-zinc-500">
                                                <span>Created on {new Date(apiKey.createdAt).toLocaleDateString()}</span>
                                                {apiKey.lastUsedAt ? (
                                                    <span className="text-xs mt-0.5">Last used {new Date(apiKey.lastUsedAt).toLocaleDateString()}</span>
                                                ) : (
                                                    <span className="text-xs mt-0.5 italic">Never used</span>
                                                )}
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                                    <DropdownMenuItem onClick={() => router.push(`/api-keys/${apiKey.id}`)}>
                                                        <Edit className="w-4 h-4 mr-2" /> View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-zinc-800" />
                                                    <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer">
                                                        <Trash2 className="w-4 h-4 mr-2" /> Revoke Key
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 px-4 border border-dashed border-white/10 rounded-xl bg-black/20">
                                    <Key className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-white mb-2">No API keys found</h3>
                                    <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
                                        {searchQuery ? "No keys match your current search criteria." : "You haven't generated any API keys yet. Create one to authenticate with our services."}
                                    </p>
                                    {searchQuery ? (
                                        <Button
                                            variant="outline"
                                            onClick={() => setSearchQuery("")}
                                            className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                                        >
                                            Clear Search
                                        </Button>
                                    ) : (
                                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                            Generate First Key
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Info Cards */}
                <div className="space-y-6">
                    <Card className="bg-zinc-900/50 border-white/5">
                        <CardHeader>
                            <CardTitle className="flex items-center text-lg">
                                <Shield className="w-5 h-5 mr-3 text-emerald-400" /> API Security
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-zinc-400">
                            <p>
                                Your API keys carry all the privileges of your account. Treat them like passwords.
                            </p>
                            <ul className="space-y-3 mt-4">
                                <li className="flex items-start gap-3">
                                    <div className="bg-zinc-800 p-1.5 rounded text-white shrink-0 mt-0.5">1</div>
                                    <p>Do not embed API keys directly in code or public repositories.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="bg-zinc-800 p-1.5 rounded text-white shrink-0 mt-0.5">2</div>
                                    <p>Use environment variables to store your keys securely.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="bg-zinc-800 p-1.5 rounded text-white shrink-0 mt-0.5">3</div>
                                    <p>Rotate your keys every 90 days for maximum security.</p>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/50 border-white/5">
                        <CardHeader>
                            <CardTitle className="flex items-center text-lg">
                                <Clock className="w-5 h-5 mr-3 text-orange-400" /> Rate Limits
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-zinc-400 space-y-4">
                            <p>
                                To prevent abuse and ensure service stability, our API implements standard rate limits based on your billing tier.
                            </p>
                            <div className="bg-black/30 p-4 rounded-lg space-y-2 border border-white/5">
                                <div className="flex justify-between items-center text-zinc-300">
                                    <span>Free Tier</span>
                                    <span className="font-mono text-white">100 req/min</span>
                                </div>
                                <div className="flex justify-between items-center text-zinc-300">
                                    <span>Pro Tier</span>
                                    <span className="font-mono text-white">1,000 req/min</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
