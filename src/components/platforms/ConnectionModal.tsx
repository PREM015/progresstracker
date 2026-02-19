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
    onSubmit: (data: Record<string, any>) => Promise<void>;
}

export function ConnectionModal({ isOpen, onClose, platformId, onSubmit }: ConnectionModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await onSubmit({ username });
            onClose();
        } catch (err) {
            console.error('Connection failed', err);
            setError('Failed to connect. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
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

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username / Profile URL</Label>
                        <Input
                            id="username"
                            placeholder={`Your ${platformId} username`}
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 font-medium">
                            {error}
                        </div>
                    )}

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
