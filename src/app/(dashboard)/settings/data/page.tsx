"use client";

import { DataSettings } from "@/components/settings";

export default function SettingsDataPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">Data & Privacy</h1>
                <DataSettings />
            </div>
        </div>
    );
}
