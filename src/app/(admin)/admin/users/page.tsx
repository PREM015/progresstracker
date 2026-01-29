// src/app/(admin)/admin/users/page.tsx
"use client";

import React, { useState } from "react";
import {
  Search,
 
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Mail,
  Shield,
  Ban,
  
  
  ChevronLeft,
  ChevronRight,
  Download,
 
} from "lucide-react";

// Mock user data
const usersData = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    role: "user",
    status: "active",
    platforms: 5,
    streak: 42,
    joinedAt: "2024-01-15",
    lastActive: "2 min ago",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    role: "admin",
    status: "active",
    platforms: 8,
    streak: 156,
    joinedAt: "2023-11-20",
    lastActive: "1 hour ago",
  },
  {
    id: 3,
    name: "Bob Wilson",
    email: "bob@example.com",
    role: "user",
    status: "inactive",
    platforms: 3,
    streak: 0,
    joinedAt: "2024-02-01",
    lastActive: "3 days ago",
  },
  {
    id: 4,
    name: "Alice Brown",
    email: "alice@example.com",
    role: "moderator",
    status: "active",
    platforms: 6,
    streak: 89,
    joinedAt: "2023-12-10",
    lastActive: "5 min ago",
  },
  {
    id: 5,
    name: "Charlie Davis",
    email: "charlie@example.com",
    role: "user",
    status: "banned",
    platforms: 2,
    streak: 0,
    joinedAt: "2024-01-25",
    lastActive: "1 week ago",
  },
];

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  const filteredUsers = usersData.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    const matchesStatus =
      selectedStatus === "all" || user.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    }
  };

  const toggleSelectUser = (id: number) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      inactive: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
      banned: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      moderator: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      user: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    };
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[role]}`}
      >
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Users
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage and monitor all users on the platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="user">User</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Platforms
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Streak
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                  <td className="px-6 py-4">
                    <span className="text-gray-800 dark:text-white">
                      {user.platforms}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-orange-500">🔥</span>
                      <span className="font-medium text-gray-800 dark:text-white">
                        {user.streak}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {user.lastActive}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative flex justify-end">
                      <button
                        onClick={() =>
                          setOpenDropdown(
                            openDropdown === user.id ? null : user.id
                          )
                        }
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>

                      {openDropdown === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-10">
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Eye className="h-4 w-4" />
                            View Details
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Edit className="h-4 w-4" />
                            Edit User
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Mail className="h-4 w-4" />
                            Send Email
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Shield className="h-4 w-4" />
                            Change Role
                          </button>
                          <hr className="my-1 dark:border-gray-700" />
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                            <Ban className="h-4 w-4" />
                            Ban User
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="h-4 w-4" />
                            Delete User
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium">1</span> to{" "}
            <span className="font-medium">{filteredUsers.length}</span> of{" "}
            <span className="font-medium">{usersData.length}</span> users
          </p>
          <div className="flex items-center gap-2">
            <button className="p-2 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">
              1
            </button>
            <button className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
              2
            </button>
            <button className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
              3
            </button>
            <button className="p-2 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}