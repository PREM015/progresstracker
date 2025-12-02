import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Check } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    description: 'Perfect for students getting started',
    features: [
      'Track up to 10 platforms',
      'Manual entry tracker',
      'Basic analytics',
      'Email support',
      'Mobile responsive',
    ],
    cta: 'Get Started',
    href: '/register',
    popular: false,
  },
  {
    name: 'Pro',
    price: '₹299',
    period: 'per month',
    description: 'Best for serious developers',
    features: [
      'Unlimited platforms',
      'Auto-sync enabled',
      'Advanced analytics & AI insights',
      'Goal tracking & achievements',
      'Email notifications',
      'Export data (CSV, PDF)',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    href: '/register?plan=pro',
    popular: true,
  },
  {
    name: 'Team',
    price: '₹999',
    period: 'per month',
    description: 'For teams and organizations',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Shared dashboards',
      'Team analytics',
      'API access',
      'Custom integrations',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section className="py-24 px-4 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-heading mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Choose the plan that fits your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`p-8 relative ${
                plan.popular
                  ? 'border-2 border-blue-500 shadow-xl scale-105'
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold font-heading mb-2">{plan.name}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{plan.description}</p>
                <div className="mb-2">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">/{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={plan.href}>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}