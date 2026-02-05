import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cache | Progress Tracker",
  description: "Cache page for Progress Tracker application",
};

export default async function AdminCachePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Cache</h1>
      
      {/* TODO: Implement Cache */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Cache page content goes here.
        </p>
      </div>
    </div>
  );
}
