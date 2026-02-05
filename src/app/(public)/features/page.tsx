import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features | Progress Tracker",
  description: "Features page for Progress Tracker application",
};

export default async function FeaturesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Features</h1>
      
      {/* TODO: Implement Features */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Features page content goes here.
        </p>
      </div>
    </div>
  );
}
