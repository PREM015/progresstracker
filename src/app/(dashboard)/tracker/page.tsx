import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import TrackerTable from "@/components/tracker/TrackerTable";
import DatePicker from "@/components/tracker/DatePicker";
import ExportButton from "@/components/tracker/ExportButton";

export const metadata = {
  title: "Tracker - CodeSync Pro",
  description: "Track your daily coding progress",
};

export default async function TrackerPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Daily Tracker
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manually track your daily coding activities
          </p>
        </div>
        <ExportButton />
      </div>

      {/* Date Range Selector */}
      <DatePicker />

      {/* Tracker Table */}
      <TrackerTable />
    </div>
  );
}