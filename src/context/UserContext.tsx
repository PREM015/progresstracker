// src/context/UserContext.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import React, { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { data, error, mutate } = useSWR(
    session?.user ? '/api/user' : null,
    fetcher
  );

  return (
    <UserContext.Provider
      value={{
        user: data?.user || null,
        isLoading: status === 'loading' || (!data && !error),
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