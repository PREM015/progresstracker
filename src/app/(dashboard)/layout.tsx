import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from '@/components/layouts/DashboardLayout';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  // 🔒 Server-side auth gate
  if (!session?.user) {
    redirect("/login");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}