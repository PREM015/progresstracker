import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit Logs | Progress Tracker",
  description: "Audit Logs page for Progress Tracker application",
};

export default async function AdminAuditLogsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Audit Logs</h1>
      
      {/* TODO: Implement Audit Logs */}
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground">
          Audit Logs page content goes here.
        </p>
      </div>
    </div>
  );
}
