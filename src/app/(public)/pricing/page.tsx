import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | Progress Tracker",
  description: "Pricing page for Progress Tracker application",
};

export default async function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Pricing</h1>
      
      {/* TODO: Implement Pricing */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Pricing page content goes here.
        </p>
      </div>
    </div>
  );
}
