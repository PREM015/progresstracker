import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Progress Tracker",
  description: "About page for Progress Tracker application",
};

export default async function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">About</h1>
      
      {/* TODO: Implement About */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          About page content goes here.
        </p>
      </div>
    </div>
  );
}
