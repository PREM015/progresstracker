import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers | Progress Tracker",
  description: "Careers page for Progress Tracker application",
};

export default async function CareersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Careers</h1>
      
      {/* TODO: Implement Careers */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Careers page content goes here.
        </p>
      </div>
    </div>
  );
}
