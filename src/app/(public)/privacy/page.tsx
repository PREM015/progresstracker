import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy | Progress Tracker",
  description: "Privacy page for Progress Tracker application",
};

export default async function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy</h1>
      
      {/* TODO: Implement Privacy */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Privacy page content goes here.
        </p>
      </div>
    </div>
  );
}
