import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Success | Progress Tracker",
  description: "Success page for Progress Tracker application",
};

export default async function CheckoutSuccessPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Success</h1>
      
      {/* TODO: Implement Success */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Success page content goes here.
        </p>
      </div>
    </div>
  );
}
