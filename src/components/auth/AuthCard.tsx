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
        <Card className={cn('w-full border-muted bg-card shadow-lg', className)}>
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
                {showSocial && (
                    <>
                        <SocialAuth />
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>
                    </>
                )}
                {children}
            </CardContent>
            {(footerLabel || footerLink) && (
                <CardFooter className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                    {footerLabel && <span>{footerLabel}</span>}
                    {footerLink && footerLinkText && (
                        <Link
                            href={footerLink}
                            className="font-medium text-primary hover:text-primary/80 hover:underline"
                        >
                            {footerLinkText}
                        </Link>
                    )}
                </CardFooter>
            )}
        </Card>
    );
}
