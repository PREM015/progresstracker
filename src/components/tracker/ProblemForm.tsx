'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTracker } from '@/hooks/useTracker';
import { TrackerEntryInput } from '@/types/tracker';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { PlatformCategory, Mood } from '@/types/tracker';
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
    category: z.string().min(1, 'Category is required'),
    platform: z.string().min(1, 'Platform is required'),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    status: z.enum(['solved', 'attempted', 'todo']),
    timeSpent: z.coerce.number().min(0),
    notes: z.string(),
    mood: z.enum(['great', 'good', 'okay', 'tired', 'frustrated']),
    productivityRating: z.coerce.number().min(1).max(5),
    energyLevel: z.coerce.number().min(1).max(5),
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
        defaultValues: {
            title: initialData?.notes?.split('] ')[1] || '',
            url: '',
            category: (initialData?.category as string) || 'DSA',
            platform: initialData?.platformId || 'leetcode',
            difficulty: 'medium',
            status: initialData?.problemsSolved && initialData.problemsSolved > 0 ? 'solved' : 'attempted',
            timeSpent: initialData?.timeSpent || 0,
            notes: initialData?.notes?.split('] ')[0]?.replace('[', '') || '',
            mood: (initialData?.mood as any) || 'good',
            productivityRating: initialData?.productivityRating || 3,
            energyLevel: initialData?.energyLevel || 3,
        },
    });

    const { createEntry } = useTracker();
    const CATEGORIES = [
        { id: 'DSA', name: 'Algorithm/DSA', platforms: ['leetcode', 'codeforces', 'hackerrank', 'geeksforgeeks', 'interviewbit'] },
        { id: 'JOB', name: 'Job Application', platforms: ['linkedin', 'wellfound', 'glassdoor', 'otta', 'custom'] },
        { id: 'GIT', name: 'Dev/Open Source', platforms: ['github', 'gitlab', 'bitbucket', 'custom'] },
        { id: 'LEARNING', name: 'Certification/Lab', platforms: ['udemy', 'coursera', 'pluralsight', 'cloudguru', 'custom'] },
        { id: 'DATA_SCIENCE', name: 'Data Science', platforms: ['kaggle', 'datacamp', 'custom'] },
    ];

    const selectedCategory = form.watch('category');
    const availablePlatforms = CATEGORIES.find(c => c.id === selectedCategory)?.platforms || ['custom'];

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
                    notes: `[${values.title}] ${values.notes}`,
                    date: new Date(),
                    category: values.category as any,
                    mood: values.mood,
                    productivityRating: values.productivityRating,
                    energyLevel: values.energyLevel,
                });
            }
        } catch (error) {
            console.error('Failed to save problem:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto glass-card border-zinc-200 dark:border-zinc-800 shadow-2xl p-0 overflow-hidden">
            <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 leading-none">
                            {isEditing ? 'Modify Activity' : 'Log Daily Progress'}
                        </CardTitle>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2">Activity Ledger</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Activity Type</FormLabel>
                                        <Select
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                // Reset platform when category changes
                                                const cat = CATEGORIES.find(c => c.id === val);
                                                if (cat) form.setValue('platform', cat.platforms[0]);
                                            }}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-xl h-12 font-bold">
                                                    <SelectValue placeholder="What are you tracking?" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800">
                                                {CATEGORIES.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id} className="font-medium">{cat.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="platform"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Source Platform</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-xl h-12 font-bold">
                                                    <SelectValue placeholder="Select platform" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800">
                                                {availablePlatforms.map(p => (
                                                    <SelectItem key={p} value={p} className="font-medium capitalize">{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Activity Title / Context</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Solving 'Median of Two Sorted Arrays'..."
                                            {...field}
                                            className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-xl h-12 font-medium"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField
                                control={form.control}
                                name="difficulty"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Depth</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-xl h-12 font-bold">
                                                    <SelectValue placeholder="Difficulty" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800">
                                                <SelectItem value="easy" className="font-medium">Easy</SelectItem>
                                                <SelectItem value="medium" className="font-medium">Medium</SelectItem>
                                                <SelectItem value="hard" className="font-medium">Hard</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Final Outcome</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-xl h-12 font-bold">
                                                    <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800">
                                                <SelectItem value="solved" className="font-medium">Solved</SelectItem>
                                                <SelectItem value="attempted" className="font-medium">Attempted</SelectItem>
                                                <SelectItem value="todo" className="font-medium">To Do</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="timeSpent"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Time (Min)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="0"
                                                {...field}
                                                className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-xl h-12 font-bold"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField
                                control={form.control}
                                name="mood"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Current Vibe</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-xl h-12 font-bold text-xs">
                                                    <SelectValue placeholder="Feeling?" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800">
                                                <SelectItem value="great">Great 😄</SelectItem>
                                                <SelectItem value="good">Good 🙂</SelectItem>
                                                <SelectItem value="okay">Okay 😐</SelectItem>
                                                <SelectItem value="tired">Tired 😴</SelectItem>
                                                <SelectItem value="frustrated">Frustrated 😤</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="productivityRating"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Yield (1-5)</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2 h-12 px-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
                                                {[1, 2, 3, 4, 5].map((val) => (
                                                    <button
                                                        key={val}
                                                        type="button"
                                                        onClick={() => field.onChange(val)}
                                                        className={cn(
                                                            "w-7 h-7 rounded-lg text-[10px] font-black transition-all",
                                                            field.value === val
                                                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 scale-110"
                                                                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                                                        )}
                                                    >
                                                        {val}
                                                    </button>
                                                ))}
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="energyLevel"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Power (1-5)</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2 h-12 px-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
                                                {[1, 2, 3, 4, 5].map((val) => (
                                                    <button
                                                        key={val}
                                                        type="button"
                                                        onClick={() => field.onChange(val)}
                                                        className={cn(
                                                            "w-7 h-7 rounded-lg text-[10px] font-black transition-all",
                                                            field.value === val
                                                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 scale-110"
                                                                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                                                        )}
                                                    >
                                                        {val}
                                                    </button>
                                                ))}
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Takeaways & Snippets</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            className="h-24 bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-2xl p-4 font-medium resize-none shadow-inner"
                                            placeholder="What did you learn today? Any blockers overcome?"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />

                        <Button
                            type="submit"
                            className="w-full h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 shadow-xl"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                isEditing ? 'Update Activity Entry' : 'Commit to Dashboard'
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
