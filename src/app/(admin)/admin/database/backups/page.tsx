import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Backups | Progress Tracker",
  description: "Backups page for Progress Tracker application",
};

export default async function AdminDatabaseBackupsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Backups</h1>
      
      {/* TODO: Implement Backups */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Backups page content goes here.
        </p>
      </div>
    </div>
  );
}
