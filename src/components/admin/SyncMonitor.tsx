import { useEffect, useState } from "react";

type SyncTask = {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  lastRun: Date | null;
};

export default function SyncMonitor() {
  const [tasks, setTasks] = useState<SyncTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/admin/sync-tasks");
        const data = await res.json();
        setTasks(data);
      } catch (err) {
        console.error("Failed to load sync tasks:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, []);

  if (loading) return <p>Loading sync tasks...</p>;
  if (!tasks.length) return <p>No sync tasks found</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Sync Monitor</h2>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="p-2 border rounded flex justify-between">
            <span>{task.name}</span>
            <span>
              {task.status}{" "}
              {task.lastRun ? `- Last run: ${new Date(task.lastRun).toLocaleString()}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
