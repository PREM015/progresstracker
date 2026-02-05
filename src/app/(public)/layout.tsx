import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Progress Tracker",
  description: "Track your progress across multiple platforms",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-bold text-xl">Progress Tracker</h1>
          <nav className="flex gap-4">
            <a href="/features" className="text-muted-foreground hover:text-foreground">Features</a>
            <a href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</a>
            <a href="/login" className="text-muted-foreground hover:text-foreground">Login</a>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          © 2024 Progress Tracker. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
