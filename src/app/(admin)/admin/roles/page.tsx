'use client';

import { useState } from 'react';
import { RolesList, RoleForm } from '@/components/admin';
import { Modal } from '@/components/common/Modal';
import { useAdminRoles, useAdminPermissions, Role } from '@/hooks/useAdminAccess';

export default function RolesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const { createRole, updateRole, isCreating, isUpdating } = useAdminRoles();
  const { permissions: availablePermissions } = useAdminPermissions();

  const handleCreate = () => {
    setSelectedRole(null);
    setIsModalOpen(true);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (selectedRole) {
        await updateRole({ id: selectedRole.id, data });
      } else {
        await createRole(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save role:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Roles</h1>
          <p className="text-zinc-400">Manage user roles and permissions</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          New Role
        </button>
      </div>

      <RolesList onEdit={handleEdit} />

      <Modal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={selectedRole ? 'Edit Role' : 'Create Role'}
      >
        <RoleForm
          role={selectedRole}
          availablePermissions={availablePermissions}
          onSubmit={handleSave}
          onCancel={() => setIsModalOpen(false)}
          isSubmitting={isCreating || isUpdating}
        />
      </Modal>
    </div>
  );
}
