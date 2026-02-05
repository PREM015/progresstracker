import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs | Progress Tracker",
  description: "Docs page for Progress Tracker application",
};

export default async function DocsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Docs</h1>
      
      {/* TODO: Implement Docs */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Docs page content goes here.
        </p>
      </div>
    </div>
  );
}
