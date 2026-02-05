import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms | Progress Tracker",
  description: "Terms page for Progress Tracker application",
};

export default async function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Terms</h1>
      
      {/* TODO: Implement Terms */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Terms page content goes here.
        </p>
      </div>
    </div>
  );
}
