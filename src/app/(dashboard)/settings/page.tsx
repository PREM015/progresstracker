import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsTabs from "@/components/settings/SettingsTabs";

export const metadata = {
  title: "Settings - CodeSync Pro",
  description: "Manage your account settings",
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your account preferences
        </p>
      </div>

      {/* Settings Content */}
      <SettingsTabs />
    </div>
  );
}