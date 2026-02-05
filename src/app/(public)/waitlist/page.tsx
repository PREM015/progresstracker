import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Waitlist | Progress Tracker",
  description: "Waitlist page for Progress Tracker application",
};

export default async function WaitlistPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Waitlist</h1>
      
      {/* TODO: Implement Waitlist */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Waitlist page content goes here.
        </p>
      </div>
    </div>
  );
}
