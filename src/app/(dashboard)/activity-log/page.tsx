
'use client';

import React, { useState } from 'react';
import { Activity } from '@/services/api/activity.service';
import { ActivityList } from '@/components/activity/ActivityList';
import { ActivityLogForm } from '@/components/activity/ActivityLogForm';
import { ActivityHeatmap } from '@/components/activity/ActivityHeatmap';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActivityLogPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingActivity(null);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Activity Log
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Track your daily progress, contributions, and learning journey.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingActivity(null);
            setShowForm(!showForm);
          }}
          className="bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Close Form' : 'Log Activity'}
        </Button>
      </div>

      {/* Heatmap Section */}
      <ActivityHeatmap refreshTrigger={refreshTrigger} />

      {/* Form Section */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ActivityLogForm
              initialData={editingActivity}
              onSuccess={handleSuccess}
              onCancel={() => setShowForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* List Section */}
      <div>
        <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">Recent Activities</h2>
        <ActivityList
          onEdit={handleEdit}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
}
