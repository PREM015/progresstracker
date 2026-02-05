import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platforms | Progress Tracker",
  description: "Platforms page for Progress Tracker application",
};

export default async function AdminPlatformsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Platforms</h1>
      
      {/* TODO: Implement Platforms */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Platforms page content goes here.
        </p>
      </div>
    </div>
  );
}
