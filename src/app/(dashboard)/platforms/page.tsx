"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Globe, Code, Briefcase, Github, Terminal, Database, Layers, BookOpen, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { platforms } from "@/config/platforms";
import { usePlatforms } from "@/hooks/usePlatforms";

export default function PlatformsPage() {
    const { connectedPlatforms, isLoading } = usePlatforms();
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    const categories = ["all", "dsa", "git", "learning", "job", "hackathon", "opensource", "design", "other"];

    const filteredPlatforms = platforms.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.slug.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const isConnected = (platformId: string) => {
        return (connectedPlatforms as any[])?.some(cp => cp.platformId === platformId || cp.platform?.id === platformId || cp.platform?.slug === platformId);
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case "dsa": return <Code className="h-4 w-4" />;
            case "git": return <Github className="h-4 w-4" />;
            case "job": return <Briefcase className="h-4 w-4" />;
            case "learning": return <BookOpen className="h-4 w-4" />;
            case "hackathon": return <Terminal className="h-4 w-4" />;
            case "opensource": return <Globe className="h-4 w-4" />;
            case "design": return <Layers className="h-4 w-4" />;
            default: return <Database className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Platforms Directory</h1>
                    <p className="text-muted-foreground mt-1">
                        Connect and track your progress across {platforms.length}+ supported platforms.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search platforms..."
                        className="pl-9 bg-background"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {categories.map(cat => (
                        <Button
                            key={cat}
                            variant={categoryFilter === cat ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCategoryFilter(cat)}
                            className="capitalize whitespace-nowrap"
                        >
                            {cat.replace("_", " ")}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPlatforms.length > 0 ? (
                    filteredPlatforms.map((platform) => {
                        const connected = isConnected(platform.id);
                        return (
                            <Card key={platform.id} className="group hover:shadow-md transition-all border-zinc-200 dark:border-zinc-800">
                                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                    <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                                        {getCategoryIcon(platform.category)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <CardTitle className="text-lg truncate" title={platform.name}>{platform.name}</CardTitle>
                                        <CardDescription className="capitalize flex items-center gap-1.5 truncate">
                                            {platform.category.replace("_", " ")}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2 text-xs mb-2">
                                        {connected ? (
                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Connected
                                            </Badge>
                                        ) : (
                                            <Badge variant={platform.isActive ? "secondary" : "destructive"} className="font-normal">
                                                {platform.isActive ? "Available" : "Maintenance"}
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className="font-normal uppercase text-[10px]">{platform.authType}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]">
                                        {platform.description || "Integrate and track your progress."}
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className="w-full" variant={connected ? "outline" : "default"} disabled={!platform.isActive}>
                                        <Link href={connected ? `/connected-platforms` : `/connected-platforms/connect?platform=${platform.slug}`}>
                                            {connected ? "Manage" : "Connect"}
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })
                ) : (
                    <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center">
                        <Search className="h-12 w-12 opacity-20 mb-4" />
                        <p>No platforms found matching "{search}"</p>
                        <Button variant="link" onClick={() => { setSearch(""); setCategoryFilter("all"); }}>
                            Clear filters
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
