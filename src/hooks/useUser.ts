import useSWR from 'swr';
import axios from 'axios';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  createdAt: Date;
  _count: {
    platforms: number;
    trackerEntries: number;
    goals: number;
    achievements: number;
  };
}

export function useUser() {
  const { data: session, status } = useSession();

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR<{ user: User }>(
    session?.user ? '/api/user/profile' : null,
    async (url) => {
      const response = await axios.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    user: data?.user,
    isLoading: status === 'loading' || isLoading,
    error,
    isAuthenticated: !!session,
    session,
    refresh: mutate,
  };
}

// Alternative: Simple user hook without profile data
export function useCurrentUser() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
  };
}