import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { User, Camera } from 'lucide-react';

interface ProfileSetupStepProps {
  onNext: (data: any) => void;
  className?: string;
}

export const ProfileSetupStep: React.FC<ProfileSetupStepProps> = ({
  onNext,
  className = '',
}) => {
  const [formData, setFormData] = React.useState({ name: '', bio: '', avatar: '' });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card p-12 max-w-2xl mx-auto relative overflow-hidden ${className}`}
    >
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

      <div className="text-center mb-10">
        <h2 className="text-4xl font-black mb-3 tracking-tight text-white">Setup Your Profile</h2>
        <p className="text-zinc-400 font-medium text-lg">Let's personalize your tracking experience</p>
      </div>

      <div className="space-y-8 relative z-10">
        <div className="flex justify-center mb-10">
          <div className="relative group">
            <div className="w-32 h-32 bg-zinc-900 border-2 border-white/10 rounded-full flex items-center justify-center text-white text-5xl font-black overflow-hidden group-hover:border-primary/50 transition-colors shadow-2xl">
              {formData.name ? (
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-white to-white/40">
                  {formData.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <User className="w-16 h-16 text-zinc-700" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 p-2 bg-primary rounded-full border-4 border-zinc-950 text-white cursor-pointer hover:scale-110 transition-transform shadow-xl">
              <Camera className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300 font-bold ml-1">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              className="h-14 text-lg bg-white/5 border-white/10 focus:border-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-zinc-300 font-bold ml-1">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e: any) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about your coding journey..."
              rows={4}
              className="bg-white/5 border-white/10 focus:border-primary/50 text-base py-4"
            />
          </div>
        </div>

        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="pt-4"
        >
          <Button
            onClick={() => onNext(formData)}
            disabled={!formData.name}
            variant="premium"
            size="xl"
            className="w-full h-16 text-xl font-black shadow-[0_20px_40px_rgba(99,102,241,0.2)]"
          >
            Continue to Platforms
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ProfileSetupStep;

