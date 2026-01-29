// src/components/goals/CreateGoalModal.tsx

'use client';

import React, { useState } from 'react';
import {  Target, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import  Button  from '@/components/ui/Button';
import Input  from '@/components/ui/Input';
import Label  from '@/components/ui/Label';
import  Textarea  from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { CreateGoalRequest, GoalType, GoalCategory } from '@/types/goal';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGoalRequest) => Promise<void>;
}

export function CreateGoalModal({ isOpen, onClose, onSubmit }: CreateGoalModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('custom');
  const [formData, setFormData] = useState<CreateGoalRequest>({
    title: '',
    description: '',
    type: 'daily',
    category: 'problems',
    target: 1,
    unit: 'problems',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'daily',
        category: 'problems',
        target: 1,
        unit: 'problems',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: typeof goalTemplates[0]) => {
    setFormData({
      title: template.title,
      description: template.description,
      type: template.type,
      category: template.category,
      target: template.target,
      unit: template.unit,
    });
    setActiveTab('custom');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Create New Goal
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">
              <Zap className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="custom">
              <Target className="h-4 w-4 mr-2" />
              Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-2">
              {goalTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="p-3 text-left border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{template.icon}</span>
                    <span className="font-medium text-sm">{template.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.target} {template.unit} ({template.type})
                  </p>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Goal Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Solve 5 problems daily"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Goal Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: GoalType) => 
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: GoalCategory) => 
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="problems">Problems</SelectItem>
                      <SelectItem value="time">Time</SelectItem>
                      <SelectItem value="streak">Streak</SelectItem>
                      <SelectItem value="commits">Commits</SelectItem>
                      <SelectItem value="applications">Applications</SelectItem>
                      <SelectItem value="courses">Courses</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target">Target *</Label>
                  <Input
                    id="target"
                    type="number"
                    min="1"
                    value={formData.target}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      target: parseInt(e.target.value) || 1 
                    })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., problems, hours"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline (Optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline || ''}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !formData.title}>
                  {isLoading ? 'Creating...' : 'Create Goal'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default CreateGoalModal;