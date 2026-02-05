import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New | Progress Tracker",
  description: "New page for Progress Tracker application",
};

export default async function AdminGoalTemplatesNewPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">New</h1>
      
      {/* TODO: Implement New */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          New page content goes here.
        </p>
      </div>
    </div>
  );
}
