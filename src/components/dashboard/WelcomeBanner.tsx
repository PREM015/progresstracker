'use client';

import React, { useEffect, useState } from 'react';

interface WelcomeBannerProps {
  userName?: string;
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface UserProfile {
  name?: string | null;
  username?: string | null;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  userName,
  className = '',
}) => {
  const [resolvedName, setResolvedName] = useState(userName);

  useEffect(() => {
    if (userName) return;

    let isMounted = true;

    const fetchUser = async () => {
      try {
        const res = await fetch('/api/user');
        const json = (await res.json()) as ApiSuccess<UserProfile>;
        if (!res.ok || !json?.success) {
          return;
        }

        const name = json.data?.name || json.data?.username || 'there';
        if (isMounted) {
          setResolvedName(name);
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
    };
  }, [userName]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getMotivation = () => {
    const messages = [
      'Focus on one meaningful step today.',
      'Small progress beats no progress.',
      'Consistency builds momentum.',
      'Keep the streak alive.',
      'Make today count.',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <div className={`bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl p-8 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {getGreeting()}, {resolvedName || 'there'}
          </h1>
          <p className="text-lg opacity-90">{getMotivation()}</p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-sm uppercase tracking-widest opacity-80">Dashboard</div>
          <div className="text-2xl font-semibold">Your progress hub</div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
