'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { AdminMetricsService } from '@/services/api/admin/metrics.service';
import { queryKeys } from './keys';

// Interfaces based on component usage. 
// Note: Actual API response might differ, using 'any' in components locally.
// I will keep specific interfaces but allow partials or anys where unsure.

export interface ApiMetric {
    totalRequests: number;
    avgLatency: number;
    errorRate: number;
    topEndpoints: { path: string; count: number; avgTime: number }[];
}

export interface SystemMetric {
    uptime: number;
    diskUsage: number;
    networkIO: number;
    cpu?: number; // Dashboard uses cpu, SystemMetrics uses uptime/disk/network
    memory?: number;
}

export interface UserMetric {
    activeUsers: number;
    newSignups: number;
    avgSessionTime: number;
    retentionRate: number;
}

export interface PerformanceMetric {
    pageLoadTime: number;
    tti: number;
    fcp: number;
}

export interface AdminMetrics {
    api: ApiMetric[];
    system: SystemMetric;
    users: UserMetric;
    performance: PerformanceMetric;
}

export function useAdminMetrics() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    const dashboardQuery = useQuery({
        queryKey: queryKeys.admin.metrics.dashboard(),
        queryFn: async () => {
            return AdminMetricsService.getDashboardMetrics();
        },
        enabled: isAdmin,
        refetchInterval: 30000,
    });

    const apiQuery = useQuery({
        queryKey: queryKeys.admin.metrics.api(),
        queryFn: async () => {
            return AdminMetricsService.getApiMetrics();
        },
        enabled: isAdmin,
        refetchInterval: 60000,
    });

    const systemQuery = useQuery({
        queryKey: queryKeys.admin.metrics.system(),
        queryFn: async () => {
            return AdminMetricsService.getSystemMetrics();
        },
        enabled: isAdmin,
        refetchInterval: 60000,
    });

    const usersQuery = useQuery({
        queryKey: queryKeys.admin.metrics.users(),
        queryFn: async () => {
            return AdminMetricsService.getUserMetrics();
        },
        enabled: isAdmin,
        refetchInterval: 60000,
    });

    const performanceQuery = useQuery({
        queryKey: queryKeys.admin.metrics.performance(),
        queryFn: async () => {
            return AdminMetricsService.getPerformanceMetrics();
        },
        enabled: isAdmin,
        refetchInterval: 60000,
    });

    return {
        dashboard: dashboardQuery.data,
        api: apiQuery.data,
        system: systemQuery.data,
        users: usersQuery.data,
        performance: performanceQuery.data,

        isLoadingDashboard: dashboardQuery.isLoading,
        isLoadingApi: apiQuery.isLoading,
        isLoadingSystem: systemQuery.isLoading,
        isLoadingUsers: usersQuery.isLoading,
        isLoadingPerformance: performanceQuery.isLoading,
    };
}
