import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goals | Progress Tracker",
  description: "Goals page for Progress Tracker application",
};

interface PageProps {
  params: {
    username: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function UsernameGoalsPage({ params, searchParams }: PageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Goals</h1>
      
      {/* TODO: Implement Goals */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Goals page content goes here.
        </p>
        
        <div className="mt-4 p-4 bg-muted rounded-md">
          <p className="text-sm font-mono">
            Debug - Route params:
            <br />- username: {params.username}
          </p>
        </div>
      </div>
    </div>
  );
}
