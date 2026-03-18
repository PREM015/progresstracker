"use client";

import React from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DeletedPlatformsPage() {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">Platforms Unavailable</h1>
            <p className="text-zinc-400 max-w-md mb-8">
                The platforms you are looking for have been removed or are no longer supported.
            </p>
            <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800" asChild>
                <Link href="/">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Return Home
                </Link>
            </Button>
        </div>
    );
}
