import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support Tickets | Progress Tracker",
  description: "Support Tickets page for Progress Tracker application",
};

export default async function AdminSupportTicketsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Support Tickets</h1>
      
      {/* TODO: Implement Support Tickets */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Support Tickets page content goes here.
        </p>
      </div>
    </div>
  );
}
