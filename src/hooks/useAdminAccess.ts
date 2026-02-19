/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminAccess.ts
// PURPOSE: Admin hooks - access control (roles and permissions)
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { AdminAccessService } from '@/services/api/admin/access.service';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface Permission {
    id: string;
    name: string;
    key: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    isSystem: boolean;
    permissions: Permission[];
    createdAt?: string;
    updatedAt?: string;
}

export type RoleInput = {
    name: string;
    description?: string;
    permissionIds: string[];
};

export type PermissionInput = {
    name: string;
    key: string;
    description?: string;
};

// =============================================================================
// ADMIN ACCESS HOOKS
// =============================================================================

export function useAdminRoles() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: queryKeys.admin.access.roles(),
        queryFn: async (): Promise<Role[]> => {
            return AdminAccessService.getRoles();
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: async (data: RoleInput) => {
            return AdminAccessService.createRole(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.access.roles() });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<RoleInput> }) => {
            return AdminAccessService.updateRole(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.access.roles() });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return AdminAccessService.deleteRole(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.access.roles() });
        },
    });

    return {
        roles: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
        createRole: createMutation.mutateAsync,
        updateRole: updateMutation.mutateAsync,
        deleteRole: deleteMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}

export function useAdminRole(id: string) {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    const query = useQuery({
        queryKey: [...queryKeys.admin.access.roles(), id],
        queryFn: async (): Promise<Role | null> => {
            return AdminAccessService.getRole(id);
        },
        enabled: isAdmin && !!id,
        staleTime: 5 * 60 * 1000,
    });

    return {
        role: query.data,
        isLoading: query.isLoading,
        error: query.error,
    };
}

export function useAdminPermissions() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: queryKeys.admin.access.permissions(),
        queryFn: async (): Promise<Permission[]> => {
            return AdminAccessService.getPermissions();
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    // Permissions might typically be system-defined, but if we allow creating them:
    const createMutation = useMutation({
        mutationFn: async (data: PermissionInput) => {
            return AdminAccessService.createPermission(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.access.permissions() });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<PermissionInput> }) => {
            return AdminAccessService.updatePermission(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.access.permissions() });
        },
    });

    return {
        permissions: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
        createPermission: createMutation.mutateAsync,
        updatePermission: updateMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
    };
}

export function useAdminPermissionMatrix() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: [...queryKeys.admin.access.all, 'matrix'],
        queryFn: async () => {
            return AdminAccessService.getMatrix();
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ roleId, permissionId, hasPermission }: { roleId: string; permissionId: string; hasPermission: boolean }) => {
            return AdminAccessService.togglePermission(roleId, permissionId, hasPermission);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...queryKeys.admin.access.all, 'matrix'] });
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.access.roles() });
        },
    });

    return {
        matrix: query.data,
        isLoading: query.isLoading,
        error: query.error,
        togglePermission: toggleMutation.mutateAsync,
        isToggling: toggleMutation.isPending
    };
}

export default useAdminRoles;
