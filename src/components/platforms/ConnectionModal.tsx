'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ConnectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    platformId: string;
}

export function ConnectionModal({ isOpen, onClose, platformId }: ConnectionModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsLoading(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="capitalize">Connect to {platformId}</DialogTitle>
                    <DialogDescription>
                        Enter your credentials or API key to verify your account.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleConnect} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username / Profile URL</Label>
                        <Input id="username" placeholder={`Your ${platformId} username`} required />
                    </div>

                    {/* Dynamic fields based on platform could go here */}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Connect Account
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
