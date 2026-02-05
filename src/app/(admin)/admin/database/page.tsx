import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Database | Progress Tracker",
  description: "Database page for Progress Tracker application",
};

export default async function AdminDatabasePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Database</h1>
      
      {/* TODO: Implement Database */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Database page content goes here.
        </p>
      </div>
    </div>
  );
}
