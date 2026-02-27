'use client';

import { ProblemForm } from '@/components/tracker/ProblemForm';
import { MetaTags } from '@/components/seo/MetaTags';
import { Button } from '@/components/ui/button';
import { PlatformCategory } from '@prisma/client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTracker } from '@/hooks/useTracker';
import { useState } from 'react';

export default function NewProblemPage() {
    const router = useRouter();
    const { createEntry } = useTracker();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            await createEntry({
                platformId: data.platform,
                problemsSolved: data.status === 'solved' ? 1 : 0,
                timeSpent: data.timeSpent || 0,
                notes: `[${data.title}] ${data.notes || ''}`,
                date: new Date(),
                category: PlatformCategory.DSA, // Corrected category
            });
            router.push('/tracker');
        } catch (error) {
            console.error('Failed to create problem:', error);
        } finally {
            setIsSubmitting(false);
        }
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
