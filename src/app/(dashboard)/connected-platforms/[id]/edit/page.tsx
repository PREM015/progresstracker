"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function EditPlatformPage() {
    const params = useParams();
    const router = useRouter();
    const platformId = params.platformId as string;

    const [loading, setLoading] = useState(true);
    const [platform, setPlatform] = useState<any>(null);

    useEffect(() => {
        fetch(`/api/platforms/${platformId}`)
            .then(r => r.json())
            .then(data => setPlatform(data.platform))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [platformId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">Edit Platform</h1>

                <div className="bg-white border border-gray-200 rounded-xl p-8">
                    <p className="text-gray-600">Platform settings for {platform?.name}</p>
                    {/* Add form fields here */}
                </div>
            </div>
        </div>
    );
}
