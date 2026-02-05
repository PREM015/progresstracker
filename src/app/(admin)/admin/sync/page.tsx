import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sync | Progress Tracker",
  description: "Sync page for Progress Tracker application",
};

export default async function AdminSyncPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Sync</h1>
      
      {/* TODO: Implement Sync */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Sync page content goes here.
        </p>
      </div>
    </div>
  );
}
