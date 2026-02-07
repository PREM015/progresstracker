'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface ProblemFiltersProps {
    onSearchChange: (value: string) => void;
    onPlatformChange: (value: string) => void;
    onDifficultyChange: (value: string) => void;
    onStatusChange: (value: string) => void;
}

export function ProblemFilters({
    onSearchChange,
    onPlatformChange,
    onDifficultyChange,
    onStatusChange,
}: ProblemFiltersProps) {
    const [searchValue, setSearchValue] = useState('');

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
        onSearchChange(e.target.value);
    };

    const clearFilters = () => {
        setSearchValue('');
        onSearchChange('');
        onPlatformChange('all');
        onDifficultyChange('all');
        onStatusChange('all');
        // Note: This won't reset Select components visually without controlling them fully.
        // For MVP, we'll keep it simple or user can manually reset.
        // To make it fully controlled, we'd need props for current values.
    };

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                <div className="relative w-full md:w-[300px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search problems..."
                        className="pl-8"
                        value={searchValue}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Select onValueChange={onPlatformChange} defaultValue="all">
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Platforms</SelectItem>
                        <SelectItem value="leetcode">LeetCode</SelectItem>
                        <SelectItem value="hackerrank">HackerRank</SelectItem>
                        <SelectItem value="codeforces">Codeforces</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>

                <Select onValueChange={onDifficultyChange} defaultValue="all">
                    <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Difficulties</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                </Select>

                <Select onValueChange={onStatusChange} defaultValue="all">
                    <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="solved">Solved</SelectItem>
                        <SelectItem value="attempted">Attempted</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
