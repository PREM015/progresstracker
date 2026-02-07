// ============================================================================
// FILE: src/hooks/useExport.ts
// PURPOSE: Data export hook - create exports, download, history
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type ExportFormat = 'csv' | 'json' | 'pdf' | 'excel';
type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';

interface ExportJob {
  id: string;
  name: string | null;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  dateFrom: Date | null;
  dateTo: Date | null;
  platforms: string[];
  categories: string[];
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  errorMessage: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

interface CreateExportRequest {
  format: ExportFormat;
  dateFrom?: string;
  dateTo?: string;
  platforms?: string[];
  categories?: string[];
  includeNotes?: boolean;
  includeStats?: boolean;
  name?: string;
}

interface ScheduledExport {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  format: ExportFormat;
  isActive: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useExport() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // ==========================================================================
  // FETCH EXPORT JOBS
  // ==========================================================================
  const jobsQuery = useQuery({
    queryKey: queryKeys.export.jobs(),
    queryFn: async (): Promise<ExportJob[]> => {
      const response = await apiClient.get<ApiResponse<{ jobs: ExportJob[] }>>(
        '/export/history'
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch export jobs');
      }
      
      return response.data.data!.jobs;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  // ==========================================================================
  // FETCH SCHEDULED EXPORTS
  // ==========================================================================
  const scheduledQuery = useQuery({
    queryKey: queryKeys.export.scheduled(),
    queryFn: async (): Promise<ScheduledExport[]> => {
      const response = await apiClient.get<ApiResponse<{ exports: ScheduledExport[] }>>(
        '/export/scheduled'
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch scheduled exports');
      }
      
      return response.data.data!.exports;
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  // ==========================================================================
  // CREATE EXPORT
  // ==========================================================================
  const createMutation = useMutation({
    mutationKey: ['export', 'create'],
    mutationFn: async (request: CreateExportRequest): Promise<ExportJob> => {
      const response = await apiClient.post<ApiResponse<{ job: ExportJob }>>(
        '/export',
        request
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to create export');
      }
      
      return response.data.data!.job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.export.jobs() });
    },
  });

  const createExport = useCallback(
    async (request: CreateExportRequest) => {
      return createMutation.mutateAsync(request);
    },
    [createMutation]
  );

  // Quick export methods
  const exportAsCSV = useCallback(
    async (options?: Omit<CreateExportRequest, 'format'>) => {
      return createExport({ ...options, format: 'csv' });
    },
    [createExport]
  );

  const exportAsJSON = useCallback(
    async (options?: Omit<CreateExportRequest, 'format'>) => {
      return createExport({ ...options, format: 'json' });
    },
    [createExport]
  );

  const exportAsPDF = useCallback(
    async (options?: Omit<CreateExportRequest, 'format'>) => {
      return createExport({ ...options, format: 'pdf' });
    },
    [createExport]
  );

  const exportAsExcel = useCallback(
    async (options?: Omit<CreateExportRequest, 'format'>) => {
      return createExport({ ...options, format: 'excel' });
    },
    [createExport]
  );

  // ==========================================================================
  // DOWNLOAD EXPORT
  // ==========================================================================
  const download = useCallback(async (jobId: string) => {
    const response = await apiClient.get<ApiResponse<{ url: string }>>(
      `/export/download/${jobId}`
    );
    
    if (response.error || !response.data?.success) {
      throw new Error(response.error || 'Failed to get download URL');
    }
    
    // Trigger download
    const link = document.createElement('a');
    link.href = response.data.data!.url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // ==========================================================================
  // CANCEL EXPORT
  // ==========================================================================
  const cancelMutation = useMutation({
    mutationKey: ['export', 'cancel'],
    mutationFn: async (jobId: string) => {
      const response = await apiClient.post(`/export/cancel/${jobId}`);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return jobId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.export.jobs() });
    },
  });

  const cancelExport = useCallback(
    async (jobId: string) => {
      return cancelMutation.mutateAsync(jobId);
    },
    [cancelMutation]
  );

  // ==========================================================================
  // DELETE EXPORT
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationKey: ['export', 'delete'],
    mutationFn: async (jobId: string) => {
      const response = await apiClient.delete(`/export/${jobId}`);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return jobId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.export.jobs() });
    },
  });

  const deleteExport = useCallback(
    async (jobId: string) => {
      return deleteMutation.mutateAsync(jobId);
    },
    [deleteMutation]
  );

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // Data
    jobs: jobsQuery.data ?? [],
    scheduledExports: scheduledQuery.data ?? [],
    
    // Loading states
    isLoading: jobsQuery.isLoading,
    isLoadingScheduled: scheduledQuery.isLoading,
    
    // Error states
    error: jobsQuery.error,
    scheduledError: scheduledQuery.error,
    
    // Actions
    createExport,
    exportAsCSV,
    exportAsJSON,
    exportAsPDF,
    exportAsExcel,
    download,
    cancelExport,
    deleteExport,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.export.all });
    },
    
    // Mutation states
    isCreating: createMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Mutation errors
    createError: createMutation.error,
    
    // Convenience
    pendingJobs: jobsQuery.data?.filter(j => ['queued', 'processing'].includes(j.status)) ?? [],
    completedJobs: jobsQuery.data?.filter(j => j.status === 'completed') ?? [],
    failedJobs: jobsQuery.data?.filter(j => j.status === 'failed') ?? [],
    getJobById: (id: string) => jobsQuery.data?.find(j => j.id === id),
  }), [
    jobsQuery.data,
    jobsQuery.isLoading,
    jobsQuery.error,
    scheduledQuery.data,
    scheduledQuery.isLoading,
    scheduledQuery.error,
    createExport,
    exportAsCSV,
    exportAsJSON,
    exportAsPDF,
    exportAsExcel,
    download,
    cancelExport,
    deleteExport,
    createMutation.isPending,
    createMutation.error,
    cancelMutation.isPending,
    deleteMutation.isPending,
    queryClient,
  ]);
}

export default useExport;