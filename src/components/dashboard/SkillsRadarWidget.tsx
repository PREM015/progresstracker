'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Radar, Brain, Sparkles } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface SkillData {
  skill: string;
  value: number;
  fullMark: number;
}

interface SkillsRadarWidgetProps {
  className?: string;
}

export function SkillsRadarWidget({ className }: SkillsRadarWidgetProps) {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSkills = async () => {
      try {
        const res = await fetch('/api/analytics/categories');
        const json = await res.json();

        if (res.ok && json?.success) {
          const data = json.data?.categories || [];
          const mapped: SkillData[] = data.slice(0, 8).map((cat: any) => ({
            skill: cat.name || cat.category,
            value: cat.score || cat.problemsSolved || 0,
            fullMark: 100,
          }));
          if (isMounted) setSkills(mapped.length ? mapped : getDefaultSkills());
        } else {
          if (isMounted) setSkills(getDefaultSkills());
        }
      } catch (error) {
        console.error('Failed to fetch skills:', error);
        if (isMounted) setSkills(getDefaultSkills());
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSkills();
    return () => { isMounted = false; };
  }, []);

  const getDefaultSkills = (): SkillData[] => [
    { skill: 'Arrays', value: 0, fullMark: 100 },
    { skill: 'Strings', value: 0, fullMark: 100 },
    { skill: 'Trees', value: 0, fullMark: 100 },
    { skill: 'Graphs', value: 0, fullMark: 100 },
    { skill: 'DP', value: 0, fullMark: 100 },
    { skill: 'Math', value: 0, fullMark: 100 },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;

    return (
      <div className="glass-card p-3 border-black/10 dark:border-white/10 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-black/80">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">
          {data.skill}
        </p>
        <p className="text-lg font-black text-zinc-900 dark:text-white">{data.value}%</p>
      </div>
    );
  };

  const hasData = skills.some(s => s.value > 0);

  if (loading) {
    return (
      <div className={cn("glass-card p-6 animate-pulse", className)}>
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="h-48 bg-zinc-200 dark:bg-zinc-800/50 rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.45, duration: 0.5 }}
      className={cn("h-full", className)}
    >
      <div className="glass-card h-full p-6 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
              <Brain className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">Skills Radar</h3>
              <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                Topic Proficiency
              </p>
            </div>
          </div>

          {hasData && (
            <div className="flex items-center gap-1 text-[10px] font-black text-violet-400">
              <Sparkles className="w-3 h-3" />
              Active
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-[200px]">
          {!hasData ? (
            <div className="h-full flex flex-col items-center justify-center glass rounded-2xl border-black/5 dark:border-white/5">
              <Radar className="w-10 h-10 text-zinc-400 dark:text-zinc-700 mb-3" />
              <p className="text-zinc-900 dark:text-white font-bold">No Skills Data</p>
              <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">Solve problems to see your strengths</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skills}>
                <PolarGrid
                  stroke="rgba(128,128,128,0.2)"
                  strokeWidth={1}
                />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{
                    fill: 'rgba(128,128,128,0.8)',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                  tickLine={false}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <RechartsRadar
                  name="Proficiency"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  animationBegin={500}
                  animationDuration={1500}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend */}
        {hasData && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {skills.slice(0, 4).map((skill, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-lg"
              >
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  {skill.skill}: {skill.value}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default SkillsRadarWidget;