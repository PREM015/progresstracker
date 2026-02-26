import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Target, Check, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface GoalTemplate {
  id: string;
  title: string;
  target: number;
  category: string;
  description?: string | null;
}

interface GoalSelection {
  templateId: string;
  title: string;
  target: number;
  category: string;
}

interface GoalSetupStepProps {
  onNext: (goals: GoalSelection[]) => void;
  className?: string;
}

export const GoalSetupStep: React.FC<GoalSetupStepProps> = ({
  onNext,
  className = '',
}) => {
  const [templates, setTemplates] = React.useState<GoalTemplate[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/goals/templates?limit=6');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch templates');
        setTemplates(json?.data?.templates || []);
      } catch (err) {
        console.error(err);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    const selected = templates.filter((t) => selectedIds.includes(t.id));
    const goals: GoalSelection[] = selected.map((t) => ({
      templateId: t.id,
      title: t.title,
      target: t.target,
      category: t.category,
    }));
    onNext(goals);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card p-12 max-w-2xl mx-auto relative overflow-hidden ${className}`}
    >
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />

      <div className="text-center mb-10">
        <h2 className="text-4xl font-black mb-3 tracking-tight text-white flex items-center justify-center gap-3">
          Set Your Goals <Target className="h-8 w-8 text-primary" />
        </h2>
        <p className="text-zinc-400 font-medium text-lg">What do you want to achieve today?</p>
      </div>

      <div className="space-y-4 mb-10 relative z-10">
        {loading ? (
          <div className="py-20 text-center glass rounded-2xl border-white/5">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Curating goal templates</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="py-20 text-center glass rounded-2xl border-white/5">
            <Target className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">No templates available. You can create custom goals later.</p>
          </div>
        ) : (
          templates.map((goal, idx) => {
            const isSelected = selectedIds.includes(goal.id);
            return (
              <motion.label
                key={goal.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => toggleSelect(goal.id)}
                className={`group flex items-center gap-6 p-5 glass border transition-all cursor-pointer rounded-2xl ${isSelected ? 'border-primary bg-primary/5 shadow-[0_10px_30px_rgba(99,102,241,0.1)]' : 'border-white/5 hover:border-white/10 hover:bg-white/5'
                  }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-primary text-white scale-110' : 'bg-zinc-900 text-zinc-600 group-hover:bg-zinc-800'
                  }`}>
                  {isSelected ? <Check className="h-6 w-6 stroke-[3px]" /> : <Target className="h-6 w-6" />}
                </div>

                <div className="flex-1">
                  <div className={`font-bold text-lg transition-colors ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                    {goal.title}
                  </div>
                  <div className="text-sm text-zinc-500 font-medium">Target: {goal.target} {goal.category}</div>
                </div>

                {isSelected && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-primary">
                    <Sparkles className="h-5 w-5 fill-current" />
                  </motion.div>
                )}
              </motion.label>
            );
          })
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button
          onClick={() => onNext([])}
          variant="glass"
          size="xl"
          className="flex-1 h-16 text-lg font-bold"
        >
          Skip
        </Button>
        <Button
          onClick={handleContinue}
          variant="premium"
          size="xl"
          className="flex-1 h-16 text-lg font-black group shadow-[0_20px_40px_rgba(99,102,241,0.2)]"
        >
          {selectedIds.length > 0 ? `Track ${selectedIds.length} Goal${selectedIds.length > 1 ? 's' : ''}` : 'Continue'}
          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </motion.div>
  );
};

export default GoalSetupStep;

