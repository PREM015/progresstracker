import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancel | Progress Tracker",
  description: "Cancel page for Progress Tracker application",
};

export default async function CheckoutCancelPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Cancel</h1>
      
      {/* TODO: Implement Cancel */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Cancel page content goes here.
        </p>
      </div>
    </div>
  );
}
