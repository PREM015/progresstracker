// src/hooks/useSettings.ts

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSettings() {
  const { data, error, mutate } = useSWR('/api/user/settings', fetcher);

  const updateSettings = async (settings: any) => {
    const response = await fetch('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error('Failed to update settings');
    }

    await mutate();
    return response.json();
  };

  return {
    settings: data?.settings,
    isLoading: !data && !error,
    error,
    updateSettings,
    mutate,
  };
}