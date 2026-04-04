'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

const CANCELLATION_REASONS = [
  'Too expensive',
  'Not using it enough',
  'Missing features',
  'Found a better alternative',
  'Technical issues',
  'Other'
];

export function CancelSubscription({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cancelType, setCancelType] = useState<'immediate' | 'end_of_period'>('end_of_period');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelType, reason, feedback })
      });
      if (!res.ok) throw new Error('Failed to cancel subscription');
      return res.json();
    },
    onSuccess: () => {
      toast.success(
        cancelType === 'immediate' 
          ? 'Subscription cancelled immediately' 
          : 'Subscription will cancel at end of billing period'
      );
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      onClose();
    },
    onError: () => {
      toast.error('Failed to cancel subscription');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            We're sorry to see you go. Please help us improve by sharing why you're cancelling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Retention Offer */}
          <div className="rounded-lg border bg-muted p-4">
            <h4 className="font-semibold mb-2">🎁 Wait! Special Offer</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Get 20% off your next 3 months if you stay
            </p>
            <Button variant="outline" size="sm">
              Claim Discount
            </Button>
          </div>

          {/* Cancellation Type */}
          <RadioGroup value={cancelType} onValueChange={(v) => setCancelType(v as any)}>
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <RadioGroupItem value="end_of_period" id="end" />
              <Label htmlFor="end" className="flex-1 cursor-pointer">
                <div className="font-medium">Cancel at end of billing period</div>
                <p className="text-sm text-muted-foreground">
                  Keep access until your current period ends
                </p>
              </Label>
            </div>
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <RadioGroupItem value="immediate" id="immediate" />
              <Label htmlFor="immediate" className="flex-1 cursor-pointer">
                <div className="font-medium">Cancel immediately</div>
                <p className="text-sm text-muted-foreground">
                  Lose access right away (no refund)
                </p>
              </Label>
            </div>
          </RadioGroup>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Why are you cancelling?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {CANCELLATION_REASONS.map((r) => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r} className="cursor-pointer">{r}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <Label>Additional feedback (optional)</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what we could do better..."
              rows={4}
            />
          </div>

          {/* Consequences */}
          <div className="rounded-lg bg-destructive/10 p-4 space-y-2 text-sm">
            <p className="font-semibold">⚠️ You will lose access to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Unlimited platform syncing</li>
              <li>Advanced analytics & insights</li>
              <li>Custom goals & templates</li>
              <li>Priority support</li>
              <li>Export capabilities</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep Subscription
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => cancelMutation.mutate()}
            disabled={!reason || cancelMutation.isPending}
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
