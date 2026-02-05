import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roles | Progress Tracker",
  description: "Roles page for Progress Tracker application",
};

export default async function AdminRolesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Roles</h1>
      
      {/* TODO: Implement Roles */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Roles page content goes here.
        </p>
      </div>
    </div>
  );
}
