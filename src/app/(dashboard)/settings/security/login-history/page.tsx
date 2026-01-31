// app/(dashboard)/settings/security/login-history/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login History',
  description: 'View your account login history and active sessions',
};

export default function LoginHistoryPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Login History</h1>
      <p className="text-gray-600">
        View your account login history and active sessions
      </p>
      {/* TODO: Implement LoginHistoryPage */}
    </div>
  );
}
