import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maintenance | Progress Tracker",
  description: "Maintenance page for Progress Tracker application",
};

export default async function MaintenancePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Maintenance</h1>
      
      {/* TODO: Implement Maintenance */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Maintenance page content goes here.
        </p>
      </div>
    </div>
  );
}
