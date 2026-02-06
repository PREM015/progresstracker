import { UsersList, UserStats } from '@/components/admin';

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Users</h1>
        <p className="text-zinc-400">Manage user accounts and activity</p>
      </div>

      <UserStats />
      <UsersList />
    </div>
  );
}