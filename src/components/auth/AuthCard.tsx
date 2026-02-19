import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SocialAuth } from './SocialAuth'; // Will be created next

interface AuthCardProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    footerLabel?: string;
    footerLink?: string;
    footerLinkText?: string;
    showSocial?: boolean;
    className?: string;
}

export function AuthCard({
    title,
    description,
    children,
    footerLabel,
    footerLink,
    footerLinkText,
    showSocial = false,
    className,
}: AuthCardProps) {
    return (
        <Card className={cn(
            'w-full border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 shadow-xl backdrop-blur-sm sm:rounded-xl overflow-hidden',
            className
        )}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />

            <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-2xl font-bold tracking-tight text-center">{title}</CardTitle>
                {description && <CardDescription className="text-center">{description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                {showSocial && (
                    <>
                        <SocialAuth />
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white dark:bg-zinc-950 px-2 text-zinc-500 dark:text-zinc-400">
                                    Or
                                </span>
                            </div>
                        </div>
                    </>
                )}
                {children}
            </CardContent>
            {(footerLabel || footerLink) && (
                <CardFooter className="flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50 py-4 border-t border-zinc-100 dark:border-zinc-800/50">
                    {footerLabel && <span>{footerLabel}</span>}
                    {footerLink && footerLinkText && (
                        <Link
                            href={footerLink}
                            className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:underline transition-colors"
                        >
                            {footerLinkText}
                        </Link>
                    )}
                </CardFooter>
            )}
        </Card>
    );
}
