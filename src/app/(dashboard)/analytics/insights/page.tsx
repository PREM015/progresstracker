"use client";

import { Metadata } from "next";
import { useState, useEffect } from "react";

export default function AnalyticsInsightsPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Insights</h1>
      
      {/* TODO: Implement Insights */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Insights page content goes here.
        </p>
      </div>
    </div>
  );
}
