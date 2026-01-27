import { Metadata } from 'next';

/**
 * Data Page
 * 
 * @created 2026-01-26
 */

export const metadata: Metadata = {
  title: 'Data | Progress Tracker',
  description: 'TODO: Add page description',
};



export default function DataPage() {
  

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Data</h1>
      
      {/* TODO: Implement page content */}
      <div className="bg-card rounded-lg p-6 shadow-sm">
        <p className="text-muted-foreground">
          This page is under construction.
        </p>
      </div>
    </div>
  );
}
