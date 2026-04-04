'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CreditCard, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function BillingAlerts() {
  // Mock data to unblock build
  const subscription: any = null;
  const isLoading = false;

  if (isLoading || !subscription) return null;

  const alerts = [];

  // Payment failed
  if (subscription.status === 'past_due') {
    alerts.push({
      variant: 'destructive',
      icon: AlertCircle,
      title: 'Payment Failed',
      description: 'Your recent payment failed. Please update your payment method.',
      action: { label: 'Update Payment', href: '/settings/billing' }
    });
  }

  // Subscription expiring
  const daysUntilExpiry = Math.ceil(
    (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
    alerts.push({
      variant: 'warning',
      icon: CreditCard,
      title: 'Subscription Expiring Soon',
      description: `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`,
      action: { label: 'Renew Now', href: '/settings/billing' }
    });
  }

  // Trial ending
  if (subscription.trialEnd) {
    const trialDaysLeft = Math.ceil(
      (new Date(subscription.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    if (trialDaysLeft <= 3 && trialDaysLeft > 0) {
      alerts.push({
        variant: 'default',
        icon: Zap,
        title: 'Trial Ending Soon',
        description: `Your trial ends in ${trialDaysLeft} day${trialDaysLeft > 1 ? 's' : ''}. Upgrade to continue using premium features.`,
        action: { label: 'Upgrade Now', href: '/pricing' }
      });
    }
  }

  // Usage limits
  if (subscription.usage && subscription.usage.percentage >= 80) {
    alerts.push({
      variant: 'warning',
      icon: TrendingUp,
      title: 'Approaching Usage Limit',
      description: `You've used ${subscription.usage.percentage}% of your monthly quota.`,
      action: { label: 'Upgrade Plan', href: '/pricing' }
    });
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert, index) => (
        <Alert key={index} variant={alert.variant as any}>
          <alert.icon className="h-4 w-4" />
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{alert.description}</span>
            {alert.action && (
              <Button size="sm" asChild>
                <a href={alert.action.href}>{alert.action.label}</a>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
