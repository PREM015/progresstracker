import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preferences | Progress Tracker",
  description: "Preferences page for Progress Tracker application",
};

export default async function NewsletterPreferencesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Preferences</h1>
      
      {/* TODO: Implement Preferences */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Preferences page content goes here.
        </p>
      </div>
    </div>
  );
}
