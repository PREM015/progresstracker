import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Moon, Sun, Monitor, Bell, Mail, ArrowRight } from 'lucide-react';

interface PreferencesStepProps {
  onNext: (prefs: any) => void;
  className?: string;
}

export const PreferencesStep: React.FC<PreferencesStepProps> = ({
  onNext,
  className = '',
}) => {
  const [preferences, setPreferences] = React.useState({
    theme: 'light',
    notifications: true,
    weeklyReport: true,
  });

  const themes = [
    { id: 'light', icon: <Sun className="h-5 w-5" />, label: 'Light' },
    { id: 'dark', icon: <Moon className="h-5 w-5" />, label: 'Dark' },
    { id: 'auto', icon: <Monitor className="h-5 w-5" />, label: 'System' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card p-12 max-w-2xl mx-auto relative overflow-hidden ${className}`}
    >
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />

      <div className="text-center mb-10">
        <h2 className="text-4xl font-black mb-3 tracking-tight text-white">Customize Experience</h2>
        <p className="text-zinc-400 font-medium text-lg">Make Progress Tracker feel like home</p>
      </div>

      <div className="space-y-10 relative z-10">
        <div className="space-y-4">
          <Label className="text-zinc-300 font-bold ml-1 text-base uppercase tracking-widest">Select Theme</Label>
          <div className="grid grid-cols-3 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setPreferences({ ...preferences, theme: theme.id as any })}
                className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all group ${preferences.theme === theme.id
                    ? 'border-primary bg-primary/5 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                    : 'border-white/5 bg-white/5 text-zinc-500 hover:border-white/10 hover:bg-white/10'
                  }`}
              >
                <div className={`p-3 rounded-xl ${preferences.theme === theme.id ? 'bg-primary text-white' : 'bg-zinc-900 group-hover:scale-110 transition-transform'}`}>
                  {theme.icon}
                </div>
                <span className="font-bold text-sm">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-zinc-300 font-bold ml-1 text-base uppercase tracking-widest">Notifications & Reports</Label>
          <div className="space-y-4">
            <div
              className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${preferences.notifications ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-white/5'
                }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${preferences.notifications ? 'bg-primary/20 text-primary' : 'bg-zinc-900 text-zinc-600'}`}>
                  <Bell className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-white">Push Notifications</div>
                  <div className="text-sm text-zinc-500 font-medium">Real-time updates on your milestones</div>
                </div>
              </div>
              <Switch
                checked={preferences.notifications}
                onCheckedChange={(checked) => setPreferences({ ...preferences, notifications: checked })}
              />
            </div>

            <div
              className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${preferences.weeklyReport ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-white/5'
                }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${preferences.weeklyReport ? 'bg-primary/20 text-primary' : 'bg-zinc-900 text-zinc-600'}`}>
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-white">Weekly Digest</div>
                  <div className="text-sm text-zinc-500 font-medium">A summary of your coding progress</div>
                </div>
              </div>
              <Switch
                checked={preferences.weeklyReport}
                onCheckedChange={(checked) => setPreferences({ ...preferences, weeklyReport: checked })}
              />
            </div>
          </div>
        </div>

        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="pt-4"
        >
          <Button
            onClick={() => onNext(preferences)}
            variant="premium"
            size="xl"
            className="w-full h-16 text-xl font-black group shadow-[0_20px_40px_rgba(99,102,241,0.2)]"
          >
            Almost Finished
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PreferencesStep;

