import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Authentication check
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Navbar */}
      <Navbar />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-auto lg:pl-64">
          <div className="container mx-auto px-4 py-6">
            <Breadcrumbs />
            <div className="mt-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
