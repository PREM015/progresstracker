import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Progress Tracker",
  description: "Admin page for Progress Tracker application",
};

export default async function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin</h1>
      
      {/* TODO: Implement Admin */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Admin page content goes here.
        </p>
      </div>
    </div>
  );
}
