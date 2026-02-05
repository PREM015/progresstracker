import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing | Progress Tracker",
  description: "Billing page for Progress Tracker application",
};

export default async function AdminBillingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Billing</h1>
      
      {/* TODO: Implement Billing */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Billing page content goes here.
        </p>
      </div>
    </div>
  );
}
