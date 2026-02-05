import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog | Progress Tracker",
  description: "Changelog page for Progress Tracker application",
};

export default async function ChangelogPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Changelog</h1>
      
      {/* TODO: Implement Changelog */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Changelog page content goes here.
        </p>
      </div>
    </div>
  );
}
