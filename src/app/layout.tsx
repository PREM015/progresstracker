import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/auth/AuthProvider";
import AutoLogout from "@/components/auth/AutoLogout"; // ✅ Add this

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CodeSync Pro - Track Your Coding Journey",
  description: "Automatically sync and track your progress across 50+ coding platforms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AutoLogout /> {/* ✅ Add auto-logout */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}