"use client";

import { motion } from "framer-motion";
import { Activity, Target, TrendingUp, CalendarCheck, Award, Layers } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      {/* HEADER */}
      <header>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Welcome back! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
          Track your coding progress, goals, achievements & more.
        </p>
      </header>

      {/* METRIC CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={<Activity className="h-7 w-7 text-blue-600" />}
          title="Daily Activity"
          value="37 problems"
          trend="+12%"
        />
        <MetricCard
          icon={<Target className="h-7 w-7 text-green-600" />}
          title="Goal Progress"
          value="68% done"
          trend="+4%"
        />
        <MetricCard
          icon={<TrendingUp className="h-7 w-7 text-purple-600" />}
          title="Weekly Growth"
          value="12 hrs"
          trend="+9%"
        />
        <MetricCard
          icon={<CalendarCheck className="h-7 w-7 text-yellow-600" />}
          title="Current Streak"
          value="7 days 🔥"
          trend="+2 days"
        />
      </section>

      {/* PLATFORM ACTIVITY */}
      <section className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Platform Activity Overview
          </h2>
        </div>

        <div className="space-y-5">
          <ProgressRow platform="LeetCode" percent={80} color="bg-yellow-400" />
          <ProgressRow platform="CodeChef" percent={55} color="bg-purple-500" />
          <ProgressRow platform="Codeforces" percent={40} color="bg-blue-500" />
          <ProgressRow platform="GitHub Commits" percent={90} color="bg-green-600" />
        </div>
      </section>

      {/* ACHIEVEMENTS */}
      <section className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Achievements
          </h2>
        </div>

        <div className="flex flex-wrap gap-4">
          <AchievementBadge title="100 Problems Solved" />
          <AchievementBadge title="7 Day Streak" />
          <AchievementBadge title="Top 5% on Codeforces" />
          <AchievementBadge title="GitHub Power Contributor" />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------ */
/*                 INTERNAL COMPONENTS             */
/* ------------------------------------------------ */

function MetricCard({ icon, title, value, trend }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 180 }}
      className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6 shadow-sm"
    >
      <div className="flex items-center gap-3">
        {icon}
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
      </div>

      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-3">
        {value}
      </p>

      <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
        {trend}
      </p>
    </motion.div>
  );
}

function ProgressRow({ platform, percent, color }) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">{platform}</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">{percent}%</span>
      </div>

      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color}`}
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}

function AchievementBadge({ title }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-sm text-sm font-semibold"
    >
      {title}
    </motion.div>
  );
}
