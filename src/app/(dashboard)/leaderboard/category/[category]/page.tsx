"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface LeaderboardUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  score: number;
  rank: number;
  change: number;
}

export default function LeaderboardCategoryPage() {
  const params = useParams();
  const category = (params.category as string).replace(/-/g, ' ').toUpperCase();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLeaderboard();
  }, [params.category]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`/api/leaderboard/${params.category}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.leaderboard || []);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: "🥇", color: "from-yellow-400 to-yellow-600", text: "text-yellow-700" };
    if (rank === 2) return { emoji: "🥈", color: "from-gray-300 to-gray-500", text: "text-gray-700" };
    if (rank === 3) return { emoji: "🥉", color: "from-amber-600 to-amber-800", text: "text-amber-700" };
    return null;
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <h1 className="text-3xl font-extrabold text-gray-900">{category} Leaderboard</h1>
              </div>
              <p className="text-gray-600">Top performers in {category.toLowerCase()}</p>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Top 3 Podium */}
        {users.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto">
            {/* 2nd Place */}
            <div className="flex flex-col items-center mt-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                  {users[1].avatar ? (
                    <img src={users[1].avatar} alt={users[1].name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white">{users[1].name[0]}</span>
                  )}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-3xl">🥈</div>
              </div>
              <p className="mt-6 font-bold text-gray-900 text-center">{users[1].name}</p>
              <p className="text-sm text-gray-600">@{users[1].username}</p>
              <p className="text-2xl font-bold text-gray-700 mt-2">{users[1].score.toLocaleString()}</p>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden">
                  {users[0].avatar ? (
                    <img src={users[0].avatar} alt={users[0].name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-white">{users[0].name[0]}</span>
                  )}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-4xl">🥇</div>
              </div>
              <p className="mt-6 font-bold text-gray-900 text-center text-lg">{users[0].name}</p>
              <p className="text-sm text-gray-600">@{users[0].username}</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{users[0].score.toLocaleString()}</p>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center mt-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                  {users[2].avatar ? (
                    <img src={users[2].avatar} alt={users[2].name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white">{users[2].name[0]}</span>
                  )}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-3xl">🥉</div>
              </div>
              <p className="mt-6 font-bold text-gray-900 text-center">{users[2].name}</p>
              <p className="text-sm text-gray-600">@{users[2].username}</p>
              <p className="text-2xl font-bold text-amber-700 mt-2">{users[2].score.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Full Rankings */}
        {filteredUsers.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">All Rankings</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const badge = getRankBadge(user.rank);
                return (
                  <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-6">
                      {/* Rank */}
                      <div className="w-12 text-center">
                        {badge ? (
                          <span className="text-3xl">{badge.emoji}</span>
                        ) : (
                          <span className="text-2xl font-bold text-gray-500">#{user.rank}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.name[0]
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
                        <p className="text-gray-600">@{user.username}</p>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">{user.score.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">points</p>
                      </div>

                      {/* Change */}
                      <div className="w-20 text-right">
                        {user.change > 0 && (
                          <div className="flex items-center justify-end gap-1 text-green-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="font-bold">{user.change}</span>
                          </div>
                        )}
                        {user.change < 0 && (
                          <div className="flex items-center justify-end gap-1 text-red-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="font-bold">{Math.abs(user.change)}</span>
                          </div>
                        )}
                        {user.change === 0 && (
                          <span className="text-gray-400 font-bold">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">
              {searchQuery ? `No results for "${searchQuery}"` : "No users in this leaderboard yet"}
            </p>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link href="/dashboard/leaderboard" className="text-blue-600 hover:text-blue-700 font-semibold flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
