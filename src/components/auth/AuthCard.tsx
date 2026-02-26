import {
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SocialAuth } from './SocialAuth';

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
        <div className={cn(
            'w-full glass-card border-white/10 dark:bg-black/60 shadow-2xl relative overflow-hidden',
            className
        )}>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            <CardHeader className="space-y-2 pt-10 pb-4">
                <CardTitle className="text-3xl font-black tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                    {title}
                </CardTitle>
                {description && <CardDescription className="text-center text-zinc-400 font-medium">{description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-8 px-8 py-6">
                {showSocial && (
                    <div className="space-y-6">
                        <SocialAuth />
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/5" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#050505] px-3 text-zinc-500 font-bold tracking-widest rounded-md">
                                    Continue with
                                </span>
                            </div>
                        </div>
                    </div>
                )}
                <div className="space-y-4">
                    {children}
                </div>
            </CardContent>
            {(footerLabel || footerLink) && (
                <CardFooter className="flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-400 bg-white/5 py-6 border-t border-white/5 transition-colors hover:bg-white/10">
                    {footerLabel && <span className="font-medium">{footerLabel}</span>}
                    {footerLink && footerLinkText && (
                        <Link
                            href={footerLink}
                            className="font-bold text-primary hover:text-primary/80 transition-all hover:underline underline-offset-4"
                        >
                            {footerLinkText}
                        </Link>
                    )}
                </CardFooter>
            )}
        </div>
    );
}


