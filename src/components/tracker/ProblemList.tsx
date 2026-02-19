'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTracker } from '@/hooks/useTracker';
import { TrackerEntry } from '@/types/tracker';
import { Button } from '@/components/ui/button';
import { ExternalLink, MoreHorizontal, Edit, Trash2, Clock, CheckCircle2, Circle } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from '@/components/common/EmptyState';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Problem {
    id: string;
    title: string;
    platform: string;
    difficulty: 'easy' | 'medium' | 'hard';
    status: 'solved' | 'attempted' | 'todo';
    url?: string;
    solvedAt?: Date;
    notes?: string;
    timeSpent?: number; // in minutes
}

interface ProblemListProps {
    problems?: Problem[];
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
}

const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
        case 'easy':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50';
        case 'medium':
            return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50';
        case 'hard':
            return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50';
        default:
            return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'solved':
            return <CheckCircle2 className="w-4 h-4 text-indigo-500" />;
        case 'attempted':
            return <div className="w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin-slow" />;
        default:
            return <Circle className="w-4 h-4 text-zinc-300" />;
    }
};

export function ProblemList({ problems = [], onEdit, onDelete }: ProblemListProps) {
    const safeProblems = (Array.isArray(problems) ? problems : []).filter(p => !!p);

    if (safeProblems.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 bg-zinc-50/50 dark:bg-zinc-900/50">
                <EmptyState
                    title="No problems found"
                    description="Try adjusting your filters or log a new problem."
                    icon={FileText}
                />
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
            <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
                    <TableRow className="hover:bg-transparent border-zinc-200 dark:border-zinc-800">
                        <TableHead className="w-[40%] pl-6">Problem</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Solved</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {safeProblems.map((problem) => (
                        <TableRow key={problem.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 transition-colors">
                            <TableCell className="pl-6 py-4">
                                <div className="flex flex-col gap-1">
                                    <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                                        {problem.title}
                                        {problem.url && (
                                            <a
                                                href={problem.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-indigo-500"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        )}
                                    </span>
                                    {problem.timeSpent && (
                                        <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            <Clock className="w-3 h-3" /> {problem.timeSpent} mins
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize font-normal text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                                    {problem.platform}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", getDifficultyStyle(problem.difficulty))}>
                                    {problem.difficulty}
                                </span>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {getStatusIcon(problem.status)}
                                    <span className="text-sm text-zinc-600 dark:text-zinc-300 capitalize">{problem.status}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-zinc-500 text-sm">
                                {problem.solvedAt
                                    ? formatDistanceToNow(problem.solvedAt, { addSuffix: true })
                                    : '-'}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-32">
                                        <DropdownMenuItem onClick={() => onEdit?.(problem.id)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                                            onClick={() => onDelete?.(problem.id)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
