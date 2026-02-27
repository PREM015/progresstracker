"use client";

import { IntegrationsSettings } from "@/components/settings";

export default function SettingsIntegrationsPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">Integrations</h1>
                <IntegrationsSettings />
            </div>
        </div>
    );
}
