import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email | Progress Tracker",
  description: "Email page for Progress Tracker application",
};

export default async function AdminEmailPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Email</h1>
      
      {/* TODO: Implement Email */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Email page content goes here.
        </p>
      </div>
    </div>
  );
}
