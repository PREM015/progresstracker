import { useEffect, useState } from "react";

type Stats = {
  totalUsers: number;
  activeUsers: number;
  totalGoals: number;
  completedGoals: number;
};

export default function SystemStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) return <p>Loading system stats...</p>;
  if (!stats) return <p>No stats available</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">System Stats</h2>
      <ul className="space-y-1">
        <li>Total Users: {stats.totalUsers}</li>
        <li>Active Users: {stats.activeUsers}</li>
        <li>Total Goals: {stats.totalGoals}</li>
        <li>Completed Goals: {stats.completedGoals}</li>
      </ul>
    </div>
  );
}
