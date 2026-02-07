
// ============================================================================
// FILE: src/config/permissions.ts
// PURPOSE: Central definition of permissions and roles
// ============================================================================

export interface PermissionDef {
    name: string;
    category: string;
    description?: string;
}

export interface RoleDef {
    description: string;
    permissions: string[];
}

export const PERMISSIONS: Record<string, PermissionDef> = {
    // User Management
    'admin.users.view': { name: 'View Users', category: 'Users', description: 'View user list and details' },
    'admin.users.manage': { name: 'Manage Users', category: 'Users', description: 'Create, update, delete users' },
    'admin.users.ban': { name: 'Ban Users', category: 'Users', description: 'Ban and unban users' },
    'admin.users.impersonate': { name: 'Impersonate Users', category: 'Users', description: 'Log in as any user' },

    // Billing
    'admin.billing.view': { name: 'View Billing', category: 'Billing', description: 'View subscriptions and revenue' },
    'admin.billing.manage': { name: 'Manage Billing', category: 'Billing', description: 'Manage plans and subscriptions' },

    // Platforms
    'admin.platforms.manage': { name: 'Manage Platforms', category: 'Platforms', description: 'Configure integrations' },
    'admin.platforms.view': { name: 'View Platforms', category: 'Platforms', description: 'View platform stats' },

    // System
    'admin.system.settings': { name: 'System Settings', category: 'System', description: 'Manage global settings' },
    'admin.audit.view': { name: 'View Audit Logs', category: 'System', description: 'View system logs' },
    'admin.audit.export': { name: 'Export Audit Logs', category: 'System', description: 'Export logs to CSV/JSON' },
    'admin.permissions.manage': { name: 'Manage Permissions', category: 'System', description: 'Assign permissions to users' },
    'admin.roles.manage': { name: 'Manage Roles', category: 'System', description: 'Assign roles to users' },

    // Communications
    'admin.notifications.send': { name: 'Send Notifications', category: 'Communications', description: 'Send broadcast notifications' },
    'admin.newsletter.manage': { name: 'Manage Newsletter', category: 'Communications', description: 'Manage subscribers' },
};

export const ROLES: Record<string, RoleDef> = {
    user: {
        description: "Standard user with access to dashboard and tracking features",
        permissions: [] // Base permissions are usually implicit or handled separately
    },
    admin: {
        description: "Administrator with access to admin panel",
        permissions: [
            'admin.users.view',
            'admin.users.manage',
            'admin.platforms.view',
            'admin.audit.view'
        ]
    },
    superadmin: {
        description: "Super Administrator with full access",
        permissions: Object.keys(PERMISSIONS)
    }
};
