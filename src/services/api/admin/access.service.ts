import { httpClient } from '@/lib/http-client';

// =============================================================================
// ADMIN ACCESS SERVICE
// =============================================================================

export const AdminAccessService = {
    /**
     * Get all roles
     */
    getRoles: async (): Promise<any[]> => {
        const response = await httpClient.get<{ roles: any[] }>('/api/admin/roles');
        return response.roles || [];
    },

    /**
     * Get role by ID
     */
    getRole: async (roleId: string): Promise<any> => {
        const response = await httpClient.get<{ role: any }>(`/api/admin/roles/${roleId}`);
        return response.role;
    },

    /**
     * Create a new role
     */
    createRole: async (data: any): Promise<any> => {
        const response = await httpClient.post<{ role: any }>('/api/admin/roles', data);
        return response.role;
    },

    /**
     * Update an existing role
     */
    updateRole: async (roleId: string, data: any): Promise<any> => {
        const response = await httpClient.patch<{ role: any }>(`/api/admin/roles/${roleId}`, data);
        return response.role;
    },

    /**
     * Delete a role
     */
    deleteRole: async (roleId: string): Promise<void> => {
        await httpClient.delete(`/api/admin/roles/${roleId}`);
    },

    /**
     * Get all permissions
     */
    getPermissions: async (): Promise<any[]> => {
        const response = await httpClient.get<{ permissions: any[] }>('/api/admin/permissions');
        return response.permissions || [];
    },

    /**
     * Create a new permission
     */
    createPermission: async (data: any): Promise<any> => {
        const response = await httpClient.post<{ permission: any }>('/api/admin/permissions', data);
        return response.permission;
    },

    /**
     * Update an existing permission
     */
    updatePermission: async (permissionId: string, data: any): Promise<any> => {
        const response = await httpClient.patch<{ permission: any }>(`/api/admin/permissions/${permissionId}`, data);
        return response.permission;
    },

    /**
     * Get permission matrix
     */
    getMatrix: async (): Promise<any> => {
        const response = await httpClient.get<{ matrix: any }>('/api/admin/permissions/matrix');
        return response.matrix;
    },

    /**
     * Toggle role permission
     */
    togglePermission: async (roleId: string, permissionId: string, hasPermission: boolean): Promise<void> => {
        if (hasPermission) {
            await httpClient.delete(`/api/admin/roles/${roleId}/permissions`, { params: { permissionId } });
        } else {
            await httpClient.post(`/api/admin/roles/${roleId}/permissions`, { permissionId });
        }
    },
};
