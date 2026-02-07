'use client';

import { ProblemForm } from '@/components/tracker/ProblemForm';
import { MetaTags } from '@/components/seo/MetaTags';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewProblemPage() {
    const router = useRouter();

    const handleSubmit = async (data: any) => {
        // Here we would call the API to save the problem
        console.log('Submitting:', data);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Redirect back to tracker
        router.push('/tracker');
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <MetaTags title="Log Problem" description="Add a new problem to your tracker" />

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/tracker">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Log Problem</h2>
                    <p className="text-muted-foreground">Add a new solved problem to your history.</p>
                </div>
            </div>

            <ProblemForm onSubmit={handleSubmit} />
        </div>
    );
}
