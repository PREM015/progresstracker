import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feedback | Progress Tracker",
  description: "Feedback page for Progress Tracker application",
};

export default async function AdminFeedbackPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Feedback</h1>
      
      {/* TODO: Implement Feedback */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Feedback page content goes here.
        </p>
      </div>
    </div>
  );
}
