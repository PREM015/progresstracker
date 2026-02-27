'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calendar as CalendarIcon, Target, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GoalService } from '@/services/api/goal.service';

interface GoalFormData {
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  unit: string;
}

interface GoalFormProps {
  goalId?: string;
  initialData?: Partial<GoalFormData>;
  onSuccess: () => void;
  onCancel: () => void;
  className?: string;
}

export const GoalForm: React.FC<GoalFormProps> = ({
  goalId,
  initialData,
  onSuccess,
  onCancel,
  className = '',
}) => {
  const [formData, setFormData] = useState<GoalFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    targetValue: initialData?.targetValue || 100,
    currentValue: initialData?.currentValue || 0,
    deadline: initialData?.deadline || '',
    category: initialData?.category || 'DSA',
    priority: initialData?.priority || 'medium',
    unit: initialData?.unit || 'units',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(
    initialData?.deadline ? new Date(initialData.deadline) : undefined
  );

  const updateField = <K extends keyof GoalFormData>(field: K, value: GoalFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Map form data to API schema
    const submitData: any = {
      title: formData.title,
      description: formData.description,
      target: formData.targetValue, // Map targetValue -> target
      progress: formData.currentValue, // Map currentValue -> progress
      category: formData.category.toUpperCase() as any, // Cast to any to bypass strict enum check here, handled by backend validation or cleaner types later
      goalType: 'CUSTOM', // Default
      metric: 'PROBLEMS_SOLVED', // Default or make selectable
      unit: formData.unit,
      deadline: date ? date.toISOString() : formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
    };

    try {
      if (goalId) {
        await GoalService.updateGoal(goalId, submitData);
      } else {
        await GoalService.createGoal(submitData);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm", className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
          <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {goalId ? 'Edit Goal' : 'Create New Goal'}
        </h3>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 flex items-start gap-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Goal Title <span className="text-red-500">*</span></Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            required
            placeholder="e.g., Learn React in 30 days"
            className="text-lg font-medium"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={3}
            placeholder="What do you want to achieve?"
            className="resize-none"
          />
        </div>

        {/* Target and Current Value */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="targetValue">Target Value <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input
                id="targetValue"
                type="number"
                value={formData.targetValue}
                onChange={(e) => updateField('targetValue', parseInt(e.target.value) || 0)}
                required
                min="1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentValue">Current Start</Label>
            <Input
              id="currentValue"
              type="number"
              value={formData.currentValue}
              onChange={(e) => updateField('currentValue', parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              value={formData.unit}
              onChange={(e) => updateField('unit', e.target.value)}
              placeholder="e.g. pages, hrs"
            />
          </div>
        </div>

        {/* Deadline, Category, Priority */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 flex flex-col">
            <Label>Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
              placeholder="e.g., Learning"
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(val: any) => updateField('priority', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.title}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {goalId ? 'Update Goal' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default GoalForm;
