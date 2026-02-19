'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTracker } from '@/hooks/useTracker';
import { TrackerEntryInput } from '@/types/tracker';
import type { PlatformCategory } from '@prisma/client';
import { Textarea } from '@/components/ui/textarea'; // Assuming we have or will treat as regular textarea if missing
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

// We can move this schema to lib/validators if reused
const problemSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    url: z.string().url('Invalid URL').optional().or(z.literal('')),
    platform: z.string().min(1, 'Platform is required'),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    status: z.enum(['solved', 'attempted', 'todo']),
    timeSpent: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
});

type ProblemFormValues = z.infer<typeof problemSchema>;

interface ProblemFormProps {
    initialData?: Partial<TrackerEntryInput>;
    onSubmit?: (data: any) => Promise<void>;
    isEditing?: boolean;
}

export function ProblemForm({ initialData, onSubmit, isEditing = false }: ProblemFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<ProblemFormValues>({
        resolver: zodResolver(problemSchema),
        defaultValues: initialData || {
            title: '',
            url: '',
            platform: 'leetcode',
            difficulty: 'medium',
            status: 'solved',
            timeSpent: 0,
            notes: '',
        },
    });

    const { createEntry } = useTracker();
    const handleSubmit = async (values: ProblemFormValues) => {
        setIsLoading(true);
        try {
            if (onSubmit) {
                await onSubmit(values);
            } else {
                await createEntry({
                    platformId: values.platform,
                    problemsSolved: values.status === 'solved' ? 1 : 0,
                    timeSpent: values.timeSpent,
                    notes: `[${values.title}] ${values.notes || ''}`,
                    date: new Date(),
                });
            }
        } catch (error) {
            console.error('Failed to save problem:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>{isEditing ? 'Edit Problem' : 'Log New Problem'}</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Problem Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Two Sum" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="platform"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Platform</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select platform" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="leetcode">LeetCode</SelectItem>
                                                <SelectItem value="hackerrank">HackerRank</SelectItem>
                                                <SelectItem value="codeforces">Codeforces</SelectItem>
                                                <SelectItem value="codewars">Codewars</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="difficulty"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Difficulty</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select difficulty" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="easy">Easy</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="hard">Hard</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="solved">Solved</SelectItem>
                                                <SelectItem value="attempted">Attempted</SelectItem>
                                                <SelectItem value="todo">To Do</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="timeSpent"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Time Spent (minutes)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Problem URL</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://leetcode.com/problems/..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea className="h-20" placeholder="Key takeaways..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? 'Update Log' : 'Save Log'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
