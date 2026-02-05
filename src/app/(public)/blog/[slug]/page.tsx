import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Progress Tracker",
  description: "Blog page for Progress Tracker application",
};

interface PageProps {
  params: {
    slug: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function BlogSlugPage({ params, searchParams }: PageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>
      
      {/* TODO: Implement Blog */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Blog page content goes here.
        </p>
        
        <div className="mt-4 p-4 bg-muted rounded-md">
          <p className="text-sm font-mono">
            Debug - Route params:
            <br />- slug: {params.slug}
          </p>
        </div>
      </div>
    </div>
  );
}
