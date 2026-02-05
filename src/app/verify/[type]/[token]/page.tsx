import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify | Progress Tracker",
  description: "Verify page for Progress Tracker application",
};

interface PageProps {
  params: {
    type: string;
    token: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function VerifyTypeTokenPage({ params, searchParams }: PageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Verify</h1>
      
      {/* TODO: Implement Verify */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Verify page content goes here.
        </p>
        
        <div className="mt-4 p-4 bg-muted rounded-md">
          <p className="text-sm font-mono">
            Debug - Route params:
            <br />- type: {params.type}
            <br />- token: {params.token}
          </p>
        </div>
      </div>
    </div>
  );
}
