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
import { Button } from '@/components/ui/button';
import { ExternalLink, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from '@/components/common/EmptyState';
import { FileText } from 'lucide-react';

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

const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
        case 'easy':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 hover:bg-green-100 dark:hover:bg-green-900';
        case 'medium':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900';
        case 'hard':
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 hover:bg-red-100 dark:hover:bg-red-900';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'solved':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
        case 'attempted':
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
        case 'todo':
            return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100';
        default:
            return '';
    }
};

export function ProblemList({ problems = [], onEdit, onDelete }: ProblemListProps) {
    if (problems.length === 0) {
        return (
            <EmptyState
                title="No problems found"
                description="Try adjusting your filters or log a new problem."
                icon={FileText}
            />
        );
    }

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[300px]">Problem</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Solved</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {problems.map((problem) => (
                        <TableRow key={problem.id}>
                            <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    <span className="flex items-center gap-2">
                                        {problem.title}
                                        {problem.url && (
                                            <a
                                                href={problem.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-muted-foreground hover:text-primary"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                    </span>
                                    {problem.timeSpent && (
                                        <span className="text-xs text-muted-foreground">
                                            Time: {problem.timeSpent} mins
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize">
                                    {problem.platform}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge className={getDifficultyColor(problem.difficulty)} variant="secondary">
                                    {problem.difficulty}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge className={getStatusColor(problem.status)} variant="outline">
                                    {problem.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                                {problem.solvedAt
                                    ? formatDistanceToNow(problem.solvedAt, { addSuffix: true })
                                    : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit?.(problem.id)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
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
