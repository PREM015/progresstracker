import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics | Progress Tracker",
  description: "Analytics page for Progress Tracker application",
};

export default async function AdminAnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>
      
      {/* TODO: Implement Analytics */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Analytics page content goes here.
        </p>
      </div>
    </div>
  );
}
