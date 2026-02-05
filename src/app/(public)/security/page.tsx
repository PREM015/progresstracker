import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security | Progress Tracker",
  description: "Security page for Progress Tracker application",
};

export default async function SecurityPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Security</h1>
      
      {/* TODO: Implement Security */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Security page content goes here.
        </p>
      </div>
    </div>
  );
}
