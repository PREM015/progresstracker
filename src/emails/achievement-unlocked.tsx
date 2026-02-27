// src/emails/achievement-unlocked.tsx
// Email when user unlocks an achievement

import {
  Text,
  Section,
  
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

interface AchievementUnlockedEmailProps {
  userName: string;
  achievementTitle: string;
  achievementDescription: string;
  achievementIcon?: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  pointsEarned: number;
  totalAchievements: number;
}

export const AchievementUnlockedEmail: React.FC<AchievementUnlockedEmailProps> = ({
  userName = 'User',
  achievementTitle = 'Achievement',
  achievementDescription = 'You did something amazing!',
  achievementIcon = '🏆',
  tier = 'gold',
  pointsEarned = 100,
  totalAchievements = 1,
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  const tierColors = {
    bronze: { bg: '#fef3e2', border: '#cd7f32', text: '#8B4513' },
    silver: { bg: '#f1f5f9', border: '#c0c0c0', text: '#6b7280' },
    gold: { bg: '#fef9c3', border: '#fbbf24', text: '#92400e' },
    platinum: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
    diamond: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  };

  const colors = tierColors[tier];

  return (
    <EmailLayout preview={`🏆 Achievement Unlocked: ${achievementTitle}`}>
      <Section style={celebrationBanner}>
        <Text style={celebrationEmoji}>🎉</Text>
        <Text style={celebrationTitle}>Achievement Unlocked!</Text>
      </Section>
      
      <Text style={paragraph}>
        Hi {userName},
      </Text>
      
      <Text style={paragraph}>
        Congratulations! Your hard work has paid off. You&apos;ve just earned a new achievement!
      </Text>

      <Section style={{
        ...achievementCard,
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}>
        <Text style={achievementIconStyle}>{achievementIcon}</Text>
        <Text style={{ ...achievementTitleStyle, color: colors.text }}>
          {achievementTitle}
        </Text>
        <Text style={achievementTier}>
          {tier.toUpperCase()} TIER
        </Text>
        <Text style={achievementDescStyle}>{achievementDescription}</Text>
        <Section style={pointsBadge}>
          <Text style={pointsText}>+{pointsEarned} XP</Text>
        </Section>
      </Section>

      <Card variant="info">
        <Text style={{ margin: 0, fontSize: '14px', textAlign: 'center' as const }}>
          You now have <strong>{totalAchievements}</strong> achievement{totalAchievements > 1 ? 's' : ''}! 🏅
        </Text>
      </Card>

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/achievements`} variant="primary">
          View All Achievements
        </Button>
      </Section>

      <Text style={paragraph}>
        Keep up the amazing work! More achievements await you on your coding journey. 🚀
      </Text>
    </EmailLayout>
  );
};

const celebrationBanner = {
  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  borderRadius: '8px',
  padding: '32px 20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const celebrationEmoji = {
  fontSize: '48px',
  margin: '0 0 8px',
};

const celebrationTitle = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#ffffff',
  margin: 0,
  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 16px',
};

const achievementCard = {
  borderRadius: '12px',
  borderWidth: '3px',
  borderStyle: 'solid' as const,
  padding: '24px',
  textAlign: 'center' as const,
  margin: '24px 0',
};

const achievementIconStyle = {
  fontSize: '64px',
  margin: '0 0 12px',
};

const achievementTitleStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const achievementTier = {
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#6b7280',
  letterSpacing: '2px',
  margin: '0 0 12px',
};

const achievementDescStyle = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 16px',
  lineHeight: '20px',
};

const pointsBadge = {
  backgroundColor: '#10b981',
  borderRadius: '20px',
  padding: '8px 16px',
  display: 'inline-block',
};

const pointsText = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#ffffff',
  margin: 0,
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

export default AchievementUnlockedEmail;