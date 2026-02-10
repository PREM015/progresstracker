/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminLogs.ts
// PURPOSE: Admin hooks - logs management (audit, system)
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface AuditLog {
    id: string;
    action: string;
    category: string;
    description: string | null;
    userId: string | null;
    user: {
        name: string | null;
        email: string | null;
    } | null;
    metadata: any;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
}

export interface SystemLog {
    id: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
    message: string;
    context: Record<string, any>;
    timestamp: string;
    source: string;
}

export interface LogFilters {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    resource?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    level?: string;
}

interface LogsResponse<T> {
    data: T[];
    meta: {
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}

// =============================================================================
// ADMIN LOGS HOOKS
// =============================================================================

export function useAdminAuditLogs(filters: LogFilters = {}) {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    const query = useQuery<LogsResponse<AuditLog>>({
        queryKey: queryKeys.admin.logs.audit(filters as Record<string, unknown>),
        queryFn: async (): Promise<LogsResponse<AuditLog>> => {
            const params: Record<string, string> = {};
            if (filters.page) params.page = String(filters.page);
            if (filters.limit) params.limit = String(filters.limit);
            if (filters.search) params.search = filters.search;
            if (filters.action) params.action = filters.action;
            if (filters.resource) params.resource = filters.resource;

            const response = await apiClient.get<any>('/admin/audit-logs', params);

            if (response.error) {
                // Return empty if error
                return { data: [], meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } };
            }

            const payload = response.data;
            // Normalize response
            const data = Array.isArray(payload) ? payload : (payload.logs || payload.data || []);
            const meta = payload.meta || payload.pagination || {
                pagination: {
                    page: filters.page || 1,
                    limit: filters.limit || 20,
                    total: data.length,
                    totalPages: 1
                }
            };

            return { data, meta };
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    return {
        logs: query.data?.data ?? [],
        pagination: query.data?.meta.pagination,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}

export function useAdminSystemLogs(filters: LogFilters = {}) {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    const query = useQuery<LogsResponse<SystemLog>>({
        queryKey: queryKeys.admin.logs.system(filters as Record<string, unknown>),
        queryFn: async (): Promise<LogsResponse<SystemLog>> => {
            const params: Record<string, string> = {};
            if (filters.page) params.page = String(filters.page);
            if (filters.limit) params.limit = String(filters.limit);
            if (filters.level) params.level = filters.level;

            const response = await apiClient.get<any>('/admin/logs', params);

            if (response.error) {
                return { data: [], meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } };
            }

            const payload = response.data;
            const data = Array.isArray(payload) ? payload : (payload.logs || payload.data || []);
            const meta = payload.meta || payload.pagination || {
                pagination: {
                    page: filters.page || 1,
                    limit: filters.limit || 20,
                    total: data.length,
                    totalPages: 1
                }
            };

            return { data, meta };
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    return {
        logs: query.data?.data ?? [],
        pagination: query.data?.meta.pagination,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch
    };
}

export default useAdminAuditLogs;
