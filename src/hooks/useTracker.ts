import useSWR from 'swr';
import axios from 'axios';
import { TrackerEntry } from '@/types/tracker';
import { useToast}  from './useToast';

interface UseTrackerOptions {
  startDate: Date;
  endDate: Date;
  platform?: string;
}

export function useTracker({ startDate, endDate, platform }: UseTrackerOptions) {
  const { toast } = useToast();

  const queryParams = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    ...(platform && platform !== 'all' && { platform }),
  });

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR<{ entries: TrackerEntry[] }>(
    `/api/tracker?${queryParams}`,
    async (url) => {
      const response = await axios.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const createEntry = async (entryData: {
    date: Date;
    platform?: string;
    problems?: number;
    timeSpent?: number;
    notes?: string;
  }) => {
    try {
      const response = await axios.post('/api/tracker', entryData);
      await mutate();
      toast({
        title: 'Entry created',
        description: 'Your tracker entry has been saved.',
        variant: 'success',
      });
      return response.data.entry;
    } catch (error: any) {
      toast({
        title: 'Failed to create entry',
        description: error.response?.data?.error || 'Please try again.',
        variant: 'error',
      });
      throw error;
    }
  };

  const updateEntry = async (id: string, data: Partial<TrackerEntry>) => {
    try {
      const response = await axios.put(`/api/tracker/${id}`, data);
      await mutate();
      toast({
        title: 'Entry updated',
        description: 'Your changes have been saved.',
        variant: 'success',
      });
      return response.data.entry;
    } catch (error: any) {
      toast({
        title: 'Failed to update entry',
        description: error.response?.data?.error || 'Please try again.',
        variant: 'error',
      });
      throw error;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await axios.delete(`/api/tracker/${id}`);
      await mutate();
      toast({
        title: 'Entry deleted',
        description: 'The entry has been removed.',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to delete entry',
        description: error.response?.data?.error || 'Please try again.',
        variant: 'error',
      });
      throw error;
    }
  };

  const bulkDelete = async (ids: string[]) => {
    try {
      const response = await axios.post('/api/tracker/bulk', { ids });
      await mutate();
      toast({
        title: 'Entries deleted',
        description: `${response.data.deletedCount} entries removed.`,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to delete entries',
        description: error.response?.data?.error || 'Please try again.',
        variant: 'error',
      });
      throw error;
    }
  };

  return {
    entries: data?.entries || [],
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    bulkDelete,
    refresh: mutate,
  };
}