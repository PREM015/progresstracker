'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

import { Github } from 'lucide-react';
import { useState } from 'react';

// Simple Google Icon if not in project
function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
            <path
                d="M12.0003 20.45c4.656 0 8.556-3.21 9.972-7.56.126-.402.21-.822.21-1.26 0-.372-.036-.756-.108-1.14H12.0003v4.188h5.688c-.288 1.488-1.044 2.76-2.076 3.732l-.084.588 3.036 2.352.21.024c2.868-2.652 4.512-6.528 4.512-10.848 0-1.104-.156-2.184-.444-3.216H12.0003V10.842h-4.26c.252-1.332.948-2.484 1.908-3.324l-.192-.624-3.132-2.424-.108-.048C3.1203 7.512 1.3203 12.012 2.7963 16.32c1.476 4.308 5.484 7.212 10.032 7.212z"
                fill="#4285F4"
            />
            <path
                d="M1.3203 12.012c-.06-.828-.06-1.632.18-2.412l3.132 2.424c-.216.924-.264 1.884-.108 2.82l-3.036 2.352c-1.476-4.308-1.476-9.108-.168-15.184z"
                fill="#FBBC05"
            />
            <path
                d="M12.0003 5.46c2.316 0 4.356.828 5.952 2.208l3.204-3.204C19.0443 2.508 15.6843 1.25 12.0003 1.25c-4.548 0-8.556 2.904-10.032 7.212l3.132 2.424c.96-.84 2.656-1.992 4.188-1.992 1.536 0 2.844.756 3.708 1.992z"
                fill="#EA4335"
            />
            <path
                d="M12.0003 22.75c-4.656 0-8.556-3.21-9.972-7.56l-3.036 2.352c1.476 4.308 5.484 7.212 10.032 7.212 3.684 0 7.044-1.258 9.156-3.194l-3.036-2.352c-1.632 1.332-3.816 2.352-6.144 2.352z"
                fill="#34A853"
            />
        </svg>
    );
}

export function SocialAuth() {
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const loginWithProvider = async (provider: 'google' | 'github') => {
        setIsLoading(true);
        try {
            await signIn(provider, { callbackUrl: '/dashboard' });
        } catch (error) {
            console.error('Social auth error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-2 gap-4">
            <Button
                variant="outline"
                type="button"
                disabled={isLoading}
                onClick={() => loginWithProvider('github')}
                className="w-full"
            >
                <Github className="mr-2 h-4 w-4" />
                GitHub
            </Button>
            <Button
                variant="outline"
                type="button"
                disabled={isLoading}
                onClick={() => loginWithProvider('google')}
                className="w-full"
            >
                <GoogleIcon className="mr-2 h-4 w-4" />
                Google
            </Button>
        </div>
    );
}
