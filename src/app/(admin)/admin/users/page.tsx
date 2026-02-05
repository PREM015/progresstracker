import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users | Progress Tracker",
  description: "Users page for Progress Tracker application",
};

export default async function AdminUsersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      
      {/* TODO: Implement Users */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Users page content goes here.
        </p>
      </div>
    </div>
  );
}
