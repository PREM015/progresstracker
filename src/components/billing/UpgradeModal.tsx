'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import PricingPage from './PricingPage'; // Reuse the pricing layout
// Or simpler version if PricingPage is too full-page

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-black border-zinc-800 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 relative">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold text-center">Upgrade Your Plan</DialogTitle>
            <DialogDescription className="text-center">Unlock more features and higher limits</DialogDescription>
          </DialogHeader>
          {/* We can wrap PricingPage to serve as content, scaling it down if needed */}
          <div className="scale-90 origin-top -mt-10">
            <PricingPage />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
