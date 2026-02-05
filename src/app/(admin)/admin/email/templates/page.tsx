import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Templates | Progress Tracker",
  description: "Templates page for Progress Tracker application",
};

export default async function AdminEmailTemplatesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Templates</h1>
      
      {/* TODO: Implement Templates */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Templates page content goes here.
        </p>
      </div>
    </div>
  );
}
