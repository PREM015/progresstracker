import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goal Templates | Progress Tracker",
  description: "Goal Templates page for Progress Tracker application",
};

export default async function AdminGoalTemplatesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Goal Templates</h1>
      
      {/* TODO: Implement Goal Templates */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Goal Templates page content goes here.
        </p>
      </div>
    </div>
  );
}
