import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports | Progress Tracker",
  description: "Reports page for Progress Tracker application",
};

export default async function AdminReportsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>
      
      {/* TODO: Implement Reports */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Reports page content goes here.
        </p>
      </div>
    </div>
  );
}
