// src/context/UserContext.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import React, { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser';
import { queryKeys } from '@/hooks/keys';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  createdAt: Date;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: any;
  mutate: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const { user, isLoading, error } = useUser();

  const mutate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
  };

  return (
    <UserContext.Provider
      value={{
        user: user as User | null,
        isLoading: status === 'loading' || isLoading,
        error,
        mutate,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within UserProvider');
  }
  return context;
}