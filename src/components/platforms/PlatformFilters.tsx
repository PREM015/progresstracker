'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Search,
    Filter,
    X,
    Code2,
    Briefcase,
    GitBranch,
    GraduationCap,
    Trophy,
    Globe,
    Building2,
    Palette,
    Database,
    MoreHorizontal
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlatformCategoryId } from '@/types/platform';

interface PlatformFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    category: string;
    onCategoryChange: (value: string) => void;
    categories: { id: string; name: string }[];
    totalResults: number;
}

export function PlatformFilters({
    search,
    onSearchChange,
    category,
    onCategoryChange,
    categories,
    totalResults
}: PlatformFiltersProps) {

    const getCategoryIcon = (id: string) => {
        switch (id) {
            case 'dsa': return <Code2 className="h-4 w-4" />;
            case 'job': return <Briefcase className="h-4 w-4" />;
            case 'git': return <GitBranch className="h-4 w-4" />;
            case 'learning': return <GraduationCap className="h-4 w-4" />;
            case 'hackathon': return <Trophy className="h-4 w-4" />;
            case 'opensource': return <Globe className="h-4 w-4" />;
            case 'company': return <Building2 className="h-4 w-4" />;
            case 'design': return <Palette className="h-4 w-4" />;
            case 'data_science': return <Database className="h-4 w-4" />;
            default: return <MoreHorizontal className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-4 bg-muted/30 p-4 rounded-xl border">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search platforms (e.g. LeetCode, GitHub...)"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10 pr-10"
                    />
                    {search && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex gap-2 min-w-[200px]">
                    <Select value={category} onValueChange={onCategoryChange}>
                        <SelectTrigger className="w-full">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder="All Categories" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    <div className="flex items-center gap-2">
                                        {getCategoryIcon(cat.id)}
                                        {cat.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <div className="flex gap-2 items-center">
                    <span>Showing <strong>{totalResults}</strong> platforms</span>
                    {category !== 'all' && (
                        <Badge variant="secondary" className="text-[10px] h-5 rounded-full px-2 flex gap-1 items-center">
                            {categories.find(c => c.id === category)?.name}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => onCategoryChange('all')} />
                        </Badge>
                    )}
                </div>

                {(search || category !== 'all') && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            onSearchChange('');
                            onCategoryChange('all');
                        }}
                        className="h-6 text-[10px]"
                    >
                        Clear all filters
                    </Button>
                )}
            </div>
        </div>
    );
}
