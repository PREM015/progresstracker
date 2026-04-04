import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UseBillingOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useBilling(options: UseBillingOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  const checkout = async (priceId: string, returnUrl?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, returnUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
      
      options.onSuccess?.();
    } catch (err: any) {
      setError(err);
      options.onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  const manageBilling = async (returnUrl?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to create billing portal session');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (err: any) {
      setError(err);
      options.onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  return { checkout, manageBilling, isLoading, error };
}
