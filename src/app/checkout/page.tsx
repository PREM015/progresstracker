import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout | Progress Tracker",
  description: "Checkout page for Progress Tracker application",
};

export default async function CheckoutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      
      {/* TODO: Implement Checkout */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Checkout page content goes here.
        </p>
      </div>
    </div>
  );
}
