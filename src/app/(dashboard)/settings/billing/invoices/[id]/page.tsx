"use client";

import { Metadata } from "next";
import { useState, useEffect } from "react";

interface PageProps {
  params: {
    id: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function SettingsBillingInvoicesIdPage({ params, searchParams }: PageProps) {
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
      <h1 className="text-3xl font-bold mb-6">Invoices</h1>
      
      {/* TODO: Implement Invoices */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Invoices page content goes here.
        </p>
        
        <div className="mt-4 p-4 bg-muted rounded-md">
          <p className="text-sm font-mono">
            Debug - Route params:
            <br />- id: {params.id}
          </p>
        </div>
      </div>
    </div>
  );
}
