import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Faq | Progress Tracker",
  description: "Faq page for Progress Tracker application",
};

export default async function FaqPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Faq</h1>
      
      {/* TODO: Implement Faq */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Faq page content goes here.
        </p>
      </div>
    </div>
  );
}
