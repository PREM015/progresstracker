/* eslint-disable @typescript-eslint/no-unused-vars */
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page | Progress Tracker",
  description: "Page page for Progress Tracker application",
};

interface PageProps {
  params: Promise<{
    username: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UsernamePage({ params, searchParams }: PageProps) {
  const { username } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Page</h1>

      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Page page content goes here.
        </p>

        <div className="mt-4 p-4 bg-muted rounded-md">
          <p className="text-sm font-mono">
            Debug - Route params:
            <br />- username: {username}
          </p>
        </div>
      </div>
    </div>
  );
}
