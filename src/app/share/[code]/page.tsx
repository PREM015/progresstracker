import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Share | Progress Tracker",
  description: "Share page for Progress Tracker application",
};

interface PageProps {
  params: {
    code: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function ShareCodePage({ params, searchParams }: PageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Share</h1>
      
      {/* TODO: Implement Share */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Share page content goes here.
        </p>
        
        <div className="mt-4 p-4 bg-muted rounded-md">
          <p className="text-sm font-mono">
            Debug - Route params:
            <br />- code: {params.code}
          </p>
        </div>
      </div>
    </div>
  );
}
