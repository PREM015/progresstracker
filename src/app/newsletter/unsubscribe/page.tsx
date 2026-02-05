import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribe | Progress Tracker",
  description: "Unsubscribe page for Progress Tracker application",
};

export default async function NewsletterUnsubscribePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Unsubscribe</h1>
      
      {/* TODO: Implement Unsubscribe */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Unsubscribe page content goes here.
        </p>
      </div>
    </div>
  );
}
