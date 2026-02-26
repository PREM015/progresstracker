import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Share2, ArrowRight, ExternalLink, Loader2 } from 'lucide-react';

interface PlatformConnectStepProps {
  onNext: () => void;
  className?: string;
}

export const PlatformConnectStep: React.FC<PlatformConnectStepProps> = ({
  onNext,
  className = '',
}) => {
  const [platforms, setPlatforms] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchPlatforms = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/platforms/available?limit=4&sortBy=popularity');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch platforms');
        setPlatforms(json?.data?.platforms || []);
      } catch (err) {
        console.error(err);
        setPlatforms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlatforms();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card p-12 max-w-3xl mx-auto relative overflow-hidden ${className}`}
    >
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500" />

      <div className="text-center mb-10">
        <h2 className="text-4xl font-black mb-3 tracking-tight text-white">Connect Platforms</h2>
        <p className="text-zinc-400 font-medium text-lg">Power up your tracking with direct integrations</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-12 relative z-10">
        {loading ? (
          <div className="col-span-full py-20 text-center glass rounded-2xl border-white/5">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Discovering available platforms</p>
          </div>
        ) : platforms.length === 0 ? (
          <div className="col-span-full py-20 text-center glass rounded-2xl border-white/5">
            <Share2 className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">No platforms found. Please try again later.</p>
          </div>
        ) : (
          platforms.map((platform, idx) => (
            <motion.div
              key={platform.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link
                href={`/platforms/connect?platform=${platform.id}`}
                className="group flex items-center gap-6 p-6 glass border-white/5 rounded-2xl hover:bg-white/5 hover:border-primary/30 transition-all hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden"
              >
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/50 to-purple-500/50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />

                <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform shadow-2xl">
                  {platform.icon || '🛠️'}
                </div>

                <div className="flex-1 text-left">
                  <div className="font-bold text-lg text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {platform.displayName || platform.name}
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </div>
                  <div className="text-sm text-zinc-500 font-medium pt-1">Sync your data automatically</div>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button
          onClick={onNext}
          variant="glass"
          size="xl"
          className="flex-1 h-16 text-lg font-bold"
        >
          Skip for Now
        </Button>
        <Button
          onClick={onNext}
          variant="premium"
          size="xl"
          className="flex-1 h-16 text-lg font-black group shadow-[0_20px_40px_rgba(99,102,241,0.2)]"
        >
          Continue
          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </motion.div>
  );
};

export default PlatformConnectStep;

