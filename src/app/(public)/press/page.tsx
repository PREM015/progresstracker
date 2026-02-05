import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press | Progress Tracker",
  description: "Press page for Progress Tracker application",
};

export default async function PressPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Press</h1>
      
      {/* TODO: Implement Press */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Press page content goes here.
        </p>
      </div>
    </div>
  );
}
