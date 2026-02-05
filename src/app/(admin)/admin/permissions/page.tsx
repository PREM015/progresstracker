import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Permissions | Progress Tracker",
  description: "Permissions page for Progress Tracker application",
};

export default async function AdminPermissionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Permissions</h1>
      
      {/* TODO: Implement Permissions */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Permissions page content goes here.
        </p>
      </div>
    </div>
  );
}
