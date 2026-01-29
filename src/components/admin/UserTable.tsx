import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  isActive: boolean;
};

export default function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  if (loading) return <p>Loading users...</p>;
  if (!users.length) return <p>No users found</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">User Management</h2>
      <table className="table-auto w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Role</th>
            <th className="px-4 py-2">Active</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="px-4 py-2">{u.name}</td>
              <td className="px-4 py-2">{u.email}</td>
              <td className="px-4 py-2">{u.role}</td>
              <td className="px-4 py-2">{u.isActive ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
