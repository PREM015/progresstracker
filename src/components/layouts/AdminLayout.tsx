// import { AdminSidebar } from '@/components/admin/AdminSidebar'; // To be implemented in Phase 9
import { Navbar } from '@/components/navigation/Navbar';
import { Sidebar } from '@/components/navigation/Sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  // Reuse primary Sidebar for now or create a dedicated admin sidebar later
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="hidden md:flex" />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/10">
          <div className="container mx-auto max-w-7xl">
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm font-medium border border-destructive/20">
              ⚠️ Admin Area
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}