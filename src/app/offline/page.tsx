import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline | Progress Tracker",
  description: "Offline page for Progress Tracker application",
};

export default async function OfflinePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Offline</h1>
      
      {/* TODO: Implement Offline */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Offline page content goes here.
        </p>
      </div>
    </div>
  );
}
