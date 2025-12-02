'use client';

import  Card  from '@/components/ui/Card';
import { Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface WelcomeBannerProps {
  userName?: string;
  streak?: number;
  todayProblems?: number;
}

export function WelcomeBanner({ userName, streak = 0, todayProblems = 0 }: WelcomeBannerProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getMotivationalMessage = () => {
    if (streak >= 7) return "You're on fire! Keep the momentum going! 🔥";
    if (todayProblems > 0) return "Great start to the day! Keep it up! 💪";
    if (streak > 0) return `${streak} day streak! Don't break the chain! ⚡`;
    return "Ready to start coding today? Let's go! 🚀";
  };

  return (
    <Card className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">
              {format(new Date(), 'EEEE, MMMM dd, yyyy')}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            {getGreeting()}, {userName || 'Developer'}!
          </h2>
          <p className="text-lg opacity-90">{getMotivationalMessage()}</p>
        </div>
        
        {streak > 0 && (
          <div className="hidden md:flex flex-col items-center bg-white/20 rounded-lg px-4 py-3 backdrop-blur-sm">
            <span className="text-3xl font-bold">{streak}</span>
            <span className="text-sm opacity-90">Day Streak</span>
          </div>
        )}
      </div>
    </Card>
  );
}