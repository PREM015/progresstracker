'use client';

import { useState } from 'react';
import { PermissionsList, PermissionMatrix, PermissionForm } from '@/components/admin';
import { Modal } from '@/components/common/Modal';
import { useAdminPermissions, Permission } from '@/hooks/useAdminAccess';

export default function PermissionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  const { createPermission, updatePermission, isCreating, isUpdating } = useAdminPermissions();

  const handleCreate = () => {
    setSelectedPermission(null);
    setIsModalOpen(true);
  };

  const handleEdit = (permission: Permission) => {
    setSelectedPermission(permission);
    setIsModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (selectedPermission) {
        await updatePermission({ id: selectedPermission.id, data });
      } else {
        await createPermission(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save permission:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Permissions</h1>
          <p className="text-zinc-400">Manage system permissions and access control</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          New Permission
        </button>
      </div>

      <PermissionMatrix />
      <PermissionsList onEdit={handleEdit} />

      <Modal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={selectedPermission ? 'Edit Permission' : 'Create Permission'}
      >
        <PermissionForm
          permission={selectedPermission}
          onSubmit={handleSave}
          onCancel={() => setIsModalOpen(false)}
          isSubmitting={isCreating || isUpdating}
        />
      </Modal>
    </div>
  );
}
