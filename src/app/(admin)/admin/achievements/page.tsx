// src/app/(admin)/admin/achievements/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Achievement, AchievementCategory, AchievementRarity, AchievementTier } from '@/types/achievement';
import { RARITY_CONFIG, TIER_CONFIG, CATEGORY_CONFIG } from '@/types/achievement';

// =============================================================================
// TYPES
// =============================================================================

interface AchievementFormData {
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  tier: AchievementTier;
  points: number;
  xpReward: number;
  requirementType: string;
  requirementMetric: string;
  requirementValue: number;
  requirementText: string;
  isHidden: boolean;
  isSecret: boolean;
  isActive: boolean;
  sortOrder: number;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function AdminAchievementsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Check admin access
  useEffect(() => {
    if (session && !session.user?.isAdmin) {
      router.push('/dashboard');
    }
  }, [session, router]);

  // State
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number; hidden: number; totalUnlocks: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // UI State
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<AchievementCategory | 'all'>('all');
  const [filterRarity, setFilterRarity] = useState<AchievementRarity | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [achievementsRes, statsRes] = await Promise.all([
        fetch('/api/admin/achievements'),
        fetch('/api/admin/achievements/stats'),
      ]);

      if (!achievementsRes.ok) throw new Error('Failed to fetch achievements');

      const [achievementsData, statsData] = await Promise.all([
        achievementsRes.json(),
        statsRes.ok ? statsRes.json() : null,
      ]);

      setAchievements(achievementsData.achievements || []);
      setStats(statsData?.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =============================================================================
  // FILTERED ACHIEVEMENTS
  // =============================================================================

  const filteredAchievements = useMemo(() => {
    let result = [...achievements];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(a => 
        a.title.toLowerCase().includes(s) ||
        a.slug.toLowerCase().includes(s) ||
        a.description.toLowerCase().includes(s)
      );
    }

    if (filterCategory !== 'all') {
      result = result.filter(a => a.category === filterCategory);
    }

    if (filterRarity !== 'all') {
      result = result.filter(a => a.rarity === filterRarity);
    }

    return result.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [achievements, search, filterCategory, filterRarity]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleCreate = useCallback(async (data: AchievementFormData) => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: data.slug,
            title: data.title,
            description: data.description,
            icon: data.icon,
            category: data.category,
            rarity: data.rarity,
            tier: data.tier,
            points: data.points,
            xpReward: data.xpReward,
            requirement: {
              type: data.requirementType,
              metric: data.requirementMetric,
              value: data.requirementValue,
            },
            requirementText: data.requirementText,
            isHidden: data.isHidden,
            isSecret: data.isSecret,
            isActive: data.isActive,
            sortOrder: data.sortOrder,
          }),
        });

        if (!response.ok) throw new Error('Failed to create achievement');

        const newAchievement = await response.json();
        setAchievements(prev => [...prev, newAchievement.achievement]);
        setShowModal(false);
      } catch (error) {
        console.error('Failed to create:', error);
      }
    });
  }, []);

  const handleUpdate = useCallback(async (id: string, data: Partial<AchievementFormData>) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/achievements/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to update achievement');

        const updated = await response.json();
        setAchievements(prev => prev.map(a => a.id === id ? updated.achievement : a));
        setEditingAchievement(null);
        setShowModal(false);
      } catch (error) {
        console.error('Failed to update:', error);
      }
    });
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/achievements/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete achievement');

        setAchievements(prev => prev.filter(a => a.id !== id));
        setDeleteConfirm(null);
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    });
  }, []);

  const handleToggleActive = useCallback(async (id: string, isActive: boolean) => {
    // Optimistic update
    setAchievements(prev => prev.map(a => a.id === id ? { ...a, isActive } : a));

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/achievements/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive }),
        });

        if (!response.ok) throw new Error('Failed to update');
      } catch {
        // Revert on error
        setAchievements(prev => prev.map(a => a.id === id ? { ...a, isActive: !isActive } : a));
      }
    });
  }, []);

  const handleSync = useCallback(async () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/achievements/sync', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to sync achievements');
        fetchData();
      } catch (error) {
        console.error('Failed to sync:', error);
      }
    });
  }, [fetchData]);

  // =============================================================================
  // RENDER
  // =============================================================================

  if (isLoading) {
    return <AdminSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Achievements</h1>
              <p className="text-sm text-gray-500 mt-1">Create, edit, and manage achievements</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSync}
                disabled={isPending}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                🔄 Sync Config
              </button>
              <button
                onClick={() => { setEditingAchievement(null); setShowModal(true); }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Add Achievement
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total" value={stats.total} icon="🏆" />
            <StatCard label="Active" value={stats.active} icon="✅" color="green" />
            <StatCard label="Hidden" value={stats.hidden} icon="👁️" color="yellow" />
            <StatCard label="Total Unlocks" value={stats.totalUnlocks} icon="🎉" color="purple" />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search achievements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as AchievementCategory | 'all')}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.emoji} {config.label}</option>
            ))}
          </select>
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value as AchievementRarity | 'all')}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white"
          >
            <option value="all">All Rarities</option>
            {Object.entries(RARITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.emoji} {config.label}</option>
            ))}
          </select>
        </div>

        {/* Results */}
        <div className="text-sm text-gray-500 mb-4">
          Showing {filteredAchievements.length} of {achievements.length} achievements
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Achievement</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rarity</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Points</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAchievements.map((achievement) => {
                  const rarityConfig = RARITY_CONFIG[achievement.rarity];
                  const categoryKey = achievement.category as unknown as AchievementCategory;
                  const categoryConfig = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.special;

                  return (
                    <tr key={achievement.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${rarityConfig.bgClass} flex items-center justify-center text-xl`}>
                            {achievement.icon}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{achievement.title}</div>
                            <div className="text-sm text-gray-500">{achievement.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {categoryConfig.emoji} {categoryConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${rarityConfig.bgClass} ${rarityConfig.textClass}`}>
                          {rarityConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-medium text-gray-900">{achievement.points}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(achievement.id, !achievement.isActive)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            achievement.isActive ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              achievement.isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditingAchievement(achievement); setShowModal(true); }}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(achievement.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredAchievements.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No achievements found
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <AchievementModal
          achievement={editingAchievement}
          onClose={() => { setShowModal(false); setEditingAchievement(null); }}
          onSubmit={editingAchievement ? (data) => handleUpdate(editingAchievement.id, data) : handleCreate}
          isPending={isPending}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Achievement"
          message="Are you sure you want to delete this achievement? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          isPending={isPending}
          variant="danger"
        />
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatCard({ label, value, icon, color = 'indigo' }: { label: string; value: number; icon: string; color?: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center text-xl mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

function AchievementModal({ achievement, onClose, onSubmit, isPending }: {
  achievement: Achievement | null;
  onClose: () => void;
  onSubmit: (data: AchievementFormData) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<AchievementFormData>({
    slug: achievement?.slug || '',
    title: achievement?.title || '',
    description: achievement?.description || '',
    icon: achievement?.icon || '🏆',
    category: (achievement?.category as unknown as AchievementCategory) || 'problems',
    rarity: achievement?.rarity || 'common',
    tier: achievement?.tier || 'bronze',
    points: achievement?.points || 10,
    xpReward: achievement?.xpReward || 0,
    requirementType: achievement?.requirement?.type || 'count',
    requirementMetric: achievement?.requirement?.metric || 'problems_solved',
    requirementValue: achievement?.requirement?.value || 1,
    requirementText: achievement?.requirementText || '',
    isHidden: achievement?.isHidden || false,
    isSecret: achievement?.isSecret || false,
    isActive: achievement?.isActive ?? true,
    sortOrder: achievement?.sortOrder || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {achievement ? 'Edit Achievement' : 'Create Achievement'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none text-center text-2xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value as AchievementCategory }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
              >
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rarity</label>
              <select
                value={form.rarity}
                onChange={(e) => setForm(f => ({ ...f, rarity: e.target.value as AchievementRarity }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
              >
                {Object.entries(RARITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
              <select
                value={form.tier}
                onChange={(e) => setForm(f => ({ ...f, tier: e.target.value as AchievementTier }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
              >
                {Object.entries(TIER_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
              <input
                type="number"
                value={form.points}
                onChange={(e) => setForm(f => ({ ...f, points: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">XP Reward</label>
              <input
                type="number"
                value={form.xpReward}
                onChange={(e) => setForm(f => ({ ...f, xpReward: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requirement Type</label>
              <select
                value={form.requirementType}
                onChange={(e) => setForm(f => ({ ...f, requirementType: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
              >
                <option value="count">Count</option>
                <option value="streak">Streak</option>
                <option value="goal">Goal</option>
                <option value="platform">Platform</option>
                <option value="special">Special</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metric</label>
              <input
                type="text"
                value={form.requirementMetric}
                onChange={(e) => setForm(f => ({ ...f, requirementMetric: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
                placeholder="problems_solved"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                type="number"
                value={form.requirementValue}
                onChange={(e) => setForm(f => ({ ...f, requirementValue: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Requirement Text</label>
            <input
              type="text"
              value={form.requirementText}
              onChange={(e) => setForm(f => ({ ...f, requirementText: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
              placeholder="Solve 100 problems"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isHidden}
                onChange={(e) => setForm(f => ({ ...f, isHidden: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Hidden</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isSecret}
                onChange={(e) => setForm(f => ({ ...f, isSecret: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Secret</span>
            </label>
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            