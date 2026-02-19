// ============================================================================
// FILE: src/hooks/useExport.ts
// PURPOSE: Data export hook - create exports, download, history
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { ExportService } from '@/services/api/export.service';
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
      return ExportService.getHistory() as any;
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
      return ExportService.getScheduled() as any;
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
      return ExportService.generate(request) as any;
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
    const blob = await ExportService.download(jobId);

    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export_${jobId}.zip`; // Format might vary
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, []);

  // ==========================================================================
  // CANCEL EXPORT
  // ==========================================================================
  const cancelMutation = useMutation({
    mutationKey: ['export', 'cancel'],
    mutationFn: async (jobId: string) => {
      return ExportService.cancel(jobId);
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
      return ExportService.delete(jobId);
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