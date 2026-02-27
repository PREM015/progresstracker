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
import { ExternalLink, MoreHorizontal, Edit, Trash2, Clock, CheckCircle2, Circle, FileText, Calendar } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import type { TrackerEntry } from '@/types/tracker';

interface ProblemListProps {
    problems?: TrackerEntry[]; // Actually accepting TrackerEntry[]
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
}

export function ProblemList({ problems = [], onEdit, onDelete }: ProblemListProps) {
    // Cast to unknown first if coming from a place where it was typed as Problem[]
    const entries = (problems as unknown as TrackerEntry[])?.filter(p => !!p) || [];

    if (entries.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 bg-zinc-50/50 dark:bg-zinc-900/50">
                <EmptyState
                    title="No activity found"
                    description="Try adjusting your filters or log a new activity."
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
                        <TableHead className="w-[30%] pl-6">Activity</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Summary</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entries.map((entry) => (
                        <TableRow key={entry.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 transition-colors">
                            <TableCell className="pl-6 py-4">
                                <div className="flex flex-col gap-1">
                                    <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                                        {entry.notes || 'Daily Activity Log'}
                                    </span>
                                    {entry.timeSpent > 0 && (
                                        <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            <Clock className="w-3 h-3" /> {entry.timeSpent} mins
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize font-normal text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                                    {entry.platform?.name || entry.category || 'Manual'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2 flex-wrap">
                                    {/* Dynamic Summary based on Category */}
                                    {(!entry.category || entry.category === 'DSA' || entry.problemsSolved > 0) && (entry.problemsSolved > 0 || entry.easyProblems > 0 || entry.mediumProblems > 0 || entry.hardProblems > 0) && (
                                        <>
                                            {entry.problemsSolved > 0 && (
                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                    {entry.problemsSolved} Solved
                                                </Badge>
                                            )}
                                            {(entry.easyProblems > 0 || entry.mediumProblems > 0 || entry.hardProblems > 0) && (
                                                <div className="flex gap-1 items-center ml-1">
                                                    {entry.easyProblems > 0 && <span className="text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1 rounded">{entry.easyProblems}E</span>}
                                                    {entry.mediumProblems > 0 && <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1 rounded">{entry.mediumProblems}M</span>}
                                                    {entry.hardProblems > 0 && <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1 rounded">{entry.hardProblems}H</span>}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {(entry.category === 'GIT' || entry.commits > 0) && (
                                        <>
                                            {entry.commits > 0 && (
                                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {entry.commits} Commits
                                                </Badge>
                                            )}
                                            {entry.pullRequests > 0 && (
                                                <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                                    {entry.pullRequests} PRs
                                                </Badge>
                                            )}
                                        </>
                                    )}

                                    {(entry.category === 'JOB' || entry.applicationsSubmitted > 0) && (
                                        <>
                                            {entry.applicationsSubmitted > 0 && (
                                                <Badge variant="secondary" className="bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400">
                                                    {entry.applicationsSubmitted} Apps
                                                </Badge>
                                            )}
                                            {entry.interviewsScheduled > 0 && (
                                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                                                    {entry.interviewsScheduled} Interviews
                                                </Badge>
                                            )}
                                        </>
                                    )}

                                    {(entry.category === 'LEARNING' || entry.coursesCompleted > 0 || entry.lessonsCompleted > 0) && (
                                        <>
                                            {entry.coursesCompleted > 0 && (
                                                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                    {entry.coursesCompleted} Courses
                                                </Badge>
                                            )}
                                            {entry.lessonsCompleted > 0 && (
                                                <Badge variant="secondary" className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400">
                                                    {entry.lessonsCompleted} Lessons
                                                </Badge>
                                            )}
                                        </>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-zinc-500 text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                    {format(new Date(entry.date), 'MMM d, yyyy')}
                                </div>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-32">
                                        <DropdownMenuItem onClick={() => onEdit?.(entry.id)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                                            onClick={() => onDelete?.(entry.id)}
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
