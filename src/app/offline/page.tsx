import { Metadata } from 'next';

/**
 * Offline Page
 * 
 * @created 2026-01-26
 */

export const metadata: Metadata = {
  title: 'Offline | Progress Tracker',
  description: 'TODO: Add page description',
};



export default function OfflinePage() {
  

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Offline</h1>
      
      {/* TODO: Implement page content */}
      <div className="bg-card rounded-lg p-6 shadow-sm">
        <p className="text-muted-foreground">
          This page is under construction.
        </p>
      </div>
    </div>
  );
}
