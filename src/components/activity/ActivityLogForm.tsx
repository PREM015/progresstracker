
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calendar as CalendarIcon, Activity as ActivityIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ActivityService } from '@/services/api/activity.service';
import { PlatformCategory } from '@prisma/client';
import { platforms } from '@/config/platforms';

interface ActivityFormData {
    date: Date;
    category: PlatformCategory;
    platformId?: string;
    description: string;
    timeSpent: number; // in minutes
    tags: string;
    pagesRead?: number;
    problemsSolved?: number;
    linesOfCode?: number;
}

interface ActivityLogFormProps {
    onSuccess: () => void;
    onCancel?: () => void;
    className?: string;
    initialData?: any;
}

export const ActivityLogForm: React.FC<ActivityLogFormProps> = ({
    onSuccess,
    onCancel,
    className = '',
    initialData,
}) => {
    const [formData, setFormData] = useState<ActivityFormData>({
        date: initialData?.date ? new Date(initialData.date) : new Date(),
        category: initialData?.category || PlatformCategory.LEARNING,
        platformId: initialData?.platform?.id || 'other',
        description: initialData?.notes || '',
        timeSpent: initialData?.timeSpent || 30,
        tags: initialData?.tags?.join(', ') || '',
        pagesRead: initialData?.customFields?.pagesRead || initialData?.articlesRead,
        problemsSolved: initialData?.problemsSolved,
        linesOfCode: initialData?.linesOfCode,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateField = <K extends keyof ActivityFormData>(field: K, value: ActivityFormData[K]) => {
        setFormData(prev => {
            const updates = { ...prev, [field]: value };
            // Reset platform if category changes
            if (field === 'category') {
                updates.platformId = 'other';
            }
            return updates;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const submitData = {
            ...formData,
            date: formData.date.toISOString(),
            platformId: formData.platformId === 'other' ? undefined : formData.platformId,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        };

        try {
            if (initialData?.id) {
                await ActivityService.updateActivity(initialData.id, submitData);
            } else {
                await ActivityService.createActivity(submitData);
            }
            onSuccess();
            // Reset form if creating new
            if (!initialData) {
                setFormData({
                    date: new Date(),
                    category: PlatformCategory.LEARNING,
                    platformId: 'other',
                    description: '',
                    timeSpent: 30,
                    tags: '',
                });
            }
        } catch (err: any) {
            console.error('Activity submission error:', err);

            let errorMessage = err.message || 'Failed to save activity';

            // Check for detailed validation errors
            if (err.data?.error?.details && Array.isArray(err.data.error.details)) {
                const details = err.data.error.details.map((d: any) =>
                    d.message || (d.path ? `${d.path.join('.')} is invalid` : JSON.stringify(d))
                ).join(', ');
                if (details) {
                    errorMessage += `: ${details}`;
                }
            } else if (err.data?.error?.message) {
                errorMessage = err.data.error.message;
            }

            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={cn("rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm", className)}>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                    <ActivityIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {initialData ? 'Edit Activity' : 'Log Activity'}
                </h3>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 flex items-start gap-3 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Date Picker */}
                    <div className="space-y-2 flex flex-col">
                        <Label>Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !formData.date && "text-muted-foreground"
                                    )}
                                >
                                    {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={formData.date}
                                    onSelect={(date) => date && updateField('date', date)}
                                    disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(val: PlatformCategory) => updateField('category', val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(PlatformCategory).map((cat) => (
                                    <SelectItem key={cat} value={cat} className="capitalize">
                                        {cat.toLowerCase().replace('_', ' ')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Platform */}
                <div className="space-y-2">
                    <Label>Platform (Optional)</Label>
                    <Select
                        value={formData.platformId}
                        onValueChange={(val) => updateField('platformId', val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="other">None / Other</SelectItem>
                            {platforms
                                .filter(p => p.isActive && p.category.toUpperCase() === formData.category)
                                .map((platform) => (
                                    <SelectItem key={platform.id} value={platform.id}>
                                        <div className="flex items-center gap-2">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={platform.icon}
                                                alt={platform.name}
                                                className="w-4 h-4 object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                            {platform.displayName}
                                        </div>
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Time Spent */}
                <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input
                        type="number"
                        value={formData.timeSpent}
                        onChange={(e) => updateField('timeSpent', parseInt(e.target.value) || 0)}
                        min="0"
                    />
                </div>

                {/* Dynamic Fields based on Category */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {formData.category === 'DSA' && (
                        <div className="space-y-2">
                            <Label>Problems Solved</Label>
                            <Input
                                type="number"
                                value={formData.problemsSolved || ''}
                                onChange={(e) => updateField('problemsSolved', parseInt(e.target.value) || 0)}
                                placeholder="0"
                            />
                        </div>
                    )}

                    {(formData.category === 'LEARNING' || formData.category === 'OTHER') && (
                        <div className="space-y-2">
                            <Label>Pages Read</Label>
                            <Input
                                type="number"
                                value={formData.pagesRead || ''}
                                onChange={(e) => updateField('pagesRead', parseInt(e.target.value) || 0)}
                                placeholder="0"
                            />
                        </div>
                    )}

                    {(formData.category === 'GIT' || formData.category === 'OPENSOURCE') && (
                        <div className="space-y-2">
                            <Label>Lines of Code</Label>
                            <Input
                                type="number"
                                value={formData.linesOfCode || ''}
                                onChange={(e) => updateField('linesOfCode', parseInt(e.target.value) || 0)}
                                placeholder="0"
                            />
                        </div>
                    )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label>Notes / Description</Label>
                    <Textarea
                        value={formData.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={3}
                        placeholder="What did you work on?"
                        className="resize-none"
                    />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                    <Label>Tags (comma separated)</Label>
                    <Input
                        value={formData.tags}
                        onChange={(e) => updateField('tags', e.target.value)}
                        placeholder="react, typescript, ui"
                    />
                </div>

                <div className="flex gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {initialData ? 'Update Activity' : 'Log Activity'}
                    </Button>
                </div>
            </form>
        </div>
    );
};
