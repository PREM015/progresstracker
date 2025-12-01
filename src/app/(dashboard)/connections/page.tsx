import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlatformGrid from "@/components/connections/PlatformGrid";
import CategoryFilter from "@/components/connections/CategoryFilter";

export const metadata = {
  title: "Connections - CodeSync Pro",
  description: "Connect your coding platforms",
};

export default async function ConnectionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Platform Connections
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Connect your accounts to automatically sync your progress
        </p>
      </div>

      {/* Category Filter */}
      <CategoryFilter />

      {/* Platform Grid */}
      <PlatformGrid />
    </div>
  );
}