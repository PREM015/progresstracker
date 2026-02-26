'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crosshair,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Edit3,
  Clock,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FocusTask {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  estimatedTime?: number;
  platform?: string;
}

interface TodaysFocusWidgetProps {
  className?: string;
}

const priorityConfig = {
  high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  low: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
};

export function TodaysFocusWidget({ className }: TodaysFocusWidgetProps) {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/goals/active?limit=5&type=DAILY');
        const json = await res.json();

        if (res.ok && json?.success) {
          const mapped: FocusTask[] = (json.data?.goals || []).map((g: any) => ({
            id: g.id,
            title: g.title,
            completed: g.status === 'COMPLETED',
            priority: g.priority || 'medium',
            estimatedTime: g.estimatedTime,
            platform: g.platform?.name,
          }));
          if (isMounted) setTasks(mapped);
        }
      } catch (error) {
        console.error('Failed to fetch focus tasks:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTasks();
    return () => { isMounted = false; };
  }, []);

  const toggleTask = async (taskId: string) => {
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    );

    // API call would go here
    try {
      await fetch(`/api/goals/${taskId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleComplete: true }),
      });
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;

    const tempTask: FocusTask = {
      id: `temp-${Date.now()}`,
      title: newTask,
      completed: false,
      priority: 'medium',
    };

    setTasks(prev => [...prev, tempTask]);
    setNewTask('');
    setShowInput(false);

    // API call would go here
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (loading) {
    return (
      <div className={cn("glass-card p-6 animate-pulse", className)}>
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-zinc-200 dark:bg-zinc-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.5 }}
      className={cn("h-full", className)}
    >
      <div className="glass-card h-full p-6 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Crosshair className="w-4 h-4 text-cyan-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">Today's Focus</h3>
              <p className="text-zinc-600 dark:text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                {completedCount}/{tasks.length} completed
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInput(!showInput)}
            className="hover:bg-black/5 dark:hover:bg-white/5 h-8 w-8 p-0"
          >
            <Plus className={cn(
              "w-4 h-4 transition-transform",
              showInput && "rotate-45"
            )} />
          </Button>
        </div>

        {/* Progress Bar */}
        {tasks.length > 0 && (
          <div className="mb-4">
            <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
              />
            </div>
          </div>
        )}

        {/* Add Task Input */}
        <AnimatePresence>
          {showInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  placeholder="Add a focus task..."
                  className="flex-1 bg-zinc-100 dark:bg-zinc-900/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50"
                  autoFocus
                />
                <Button
                  onClick={addTask}
                  size="sm"
                  className="px-4"
                >
                  Add
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tasks List */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Zap className="w-10 h-10 text-zinc-400 dark:text-zinc-700 mb-3" />
              <p className="text-zinc-900 dark:text-white font-bold">No Tasks Yet</p>
              <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">Add your focus tasks for today</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {tasks.map((task, idx) => {
                const priorityCfg = priorityConfig[task.priority];

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-xl border transition-all",
                      task.completed
                        ? "bg-zinc-100 dark:bg-zinc-900/30 border-black/5 dark:border-zinc-800"
                        : "bg-zinc-50 dark:bg-zinc-900/50 border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
                    )}
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-600 hover:text-primary transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-bold truncate transition-all",
                        task.completed ? "text-zinc-500 line-through" : "text-zinc-900 dark:text-white"
                      )}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.platform && (
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                            {task.platform}
                          </span>
                        )}
                        {task.estimatedTime && (
                          <span className="flex items-center gap-1 text-[9px] text-zinc-600">
                            <Clock className="w-2.5 h-2.5" />
                            {task.estimatedTime}m
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                      priorityCfg.bg, priorityCfg.color, priorityCfg.border, "border"
                    )}>
                      {task.priority}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {tasks.length > 0 && completedCount === tasks.length && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center"
          >
            <p className="text-emerald-400 font-bold text-sm">🎉 All tasks completed!</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default TodaysFocusWidget;