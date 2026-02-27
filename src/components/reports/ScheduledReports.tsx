'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Mail, CalendarClock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

interface ScheduledReportsProps {
  className?: string;
}

export const ScheduledReports: React.FC<ScheduledReportsProps> = ({
  className = '',
}) => {
  const [schedule, setSchedule] = useState({
    weekly: true,
    monthly: true,
    email: 'user@example.com',
  });

  return (
    <GlassCard className={`p-6 ${className} h-full relative overflow-hidden border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/50`}>
      <div className="absolute top-0 right-0 p-24 bg-purple-500/10 blur-[80px] rounded-full -mr-12 -mt-12 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Scheduled Reports</h3>
            <p className="text-sm text-zinc-500 dark:text-purple-200/60">Automate your insights</p>
          </div>
        </div>

        <div className="space-y-6 flex-grow">
          <div className="space-y-2.5">
            <label className="block text-xs font-medium text-zinc-500 dark:text-purple-200/70 uppercase tracking-wider">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400 group-focus-within:text-purple-500 transition-colors" />
              <Input
                type="email"
                value={schedule.email}
                onChange={(e) => setSchedule({ ...schedule, email: e.target.value })}
                className="pl-10 h-11 bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 rounded-xl transition-all hover:bg-zinc-50 dark:hover:bg-white/10"
              />
            </div>
            <p className="text-xs text-zinc-500 px-1">Reports will be sent to this email automatically.</p>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-4 border border-zinc-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors group">
              <div className="flex items-center gap-3.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-500/20 transition-colors">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-zinc-900 dark:text-gray-200">Weekly Digest</div>
                  <div className="text-xs text-zinc-500 dark:text-gray-500 mt-0.5">Every Monday at 9 AM</div>
                </div>
              </div>
              <Switch
                checked={schedule.weekly}
                onCheckedChange={(checked) => setSchedule({ ...schedule, weekly: checked })}
                className="data-[state=checked]:bg-blue-600"
              />
            </label>

            <label className="flex items-center justify-between p-4 border border-zinc-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors group">
              <div className="flex items-center gap-3.5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/20 transition-colors">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-zinc-900 dark:text-gray-200">Monthly Summary</div>
                  <div className="text-xs text-zinc-500 dark:text-gray-500 mt-0.5">1st of every month</div>
                </div>
              </div>
              <Switch
                checked={schedule.monthly}
                onCheckedChange={(checked) => setSchedule({ ...schedule, monthly: checked })}
                className="data-[state=checked]:bg-emerald-600"
              />
            </label>
          </div>
        </div>

        <Button className="w-full mt-6 py-6 bg-zinc-100 dark:bg-white/5 hover:bg-purple-600 dark:hover:bg-purple-600 text-zinc-900 dark:text-purple-200 hover:text-white border border-zinc-200 dark:border-white/10 rounded-xl transition-all hover:shadow-lg hover:shadow-purple-600/20 active:scale-[0.99] font-medium">
          Save Schedule
        </Button>
      </div>
    </GlassCard>
  );
};

export default ScheduledReports;
