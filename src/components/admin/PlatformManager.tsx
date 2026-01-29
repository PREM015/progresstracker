import { useEffect, useState } from "react";


type Platform = {
  id: string;
  name: string;
  status: "active" | "inactive";
  lastSync: Date | null;
};

export default function PlatformManager() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlatforms() {
      try {
        // Use Prisma on server-side API or through tRPC / Next.js API route
        const res = await fetch("/api/admin/platforms");
        const data = await res.json();
        setPlatforms(data);
      } catch (err) {
        console.error("Failed to load platforms:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPlatforms();
  }, []);

  if (loading) return <p>Loading platforms...</p>;
  if (!platforms.length) return <p>No platforms found</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Platform Manager</h2>
      <table className="table-auto w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Last Sync</th>
          </tr>
        </thead>
        <tbody>
          {platforms.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="px-4 py-2">{p.name}</td>
              <td className="px-4 py-2">{p.status}</td>
              <td className="px-4 py-2">
                {p.lastSync ? new Date(p.lastSync).toLocaleString() : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
