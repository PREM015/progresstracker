"use client";

export default function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: 0,
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        'Connect up to 3 platforms',
        'Basic goal tracking',
        'Manual sync',
        'Basic analytics',
        'Community support',
      ],
      cta: 'Get Started',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: 9,
      period: 'month',
      description: 'For serious developers',
      features: [
        'Unlimited platforms',
        'Advanced goal tracking',
        'Auto-sync (hourly)',
        'Advanced analytics & insights',
        'Priority support',
        'Custom integrations',
        'Export data',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Team',
      price: 29,
      period: 'month',
      description: 'For teams and organizations',
      features: [
        'Everything in Pro',
        'Up to 10 team members',
        'Team analytics',
        'Admin dashboard',
        'SSO & SAML',
        'Dedicated support',
        'Custom branding',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">Choose the plan that's right for you</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-xl p-8 ${plan.highlighted
                  ? 'border-2 border-indigo-600 shadow-xl scale-105'
                  : 'border border-gray-200'
                }`}
            >
              {plan.highlighted && (
                <div className="text-center mb-4">
                  <span className="px-3 py-1 bg-indigo-600 text-white text-sm font-medium rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-5xl font-bold">${plan.price}</span>
                <span className="text-gray-600">/{plan.period}</span>
              </div>
              <p className="text-gray-600 mb-6">{plan.description}</p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, fidx) => (
                  <li key={fidx} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.name === 'Free' ? '/register' : '/register?plan=' + plan.name.toLowerCase()}
                className={`block w-full py-3 text-center rounded-lg font-medium transition ${plan.highlighted
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            <div>
              <h3 className="font-bold mb-2">Can I switch plans?</h3>
              <p className="text-gray-600 text-sm">Yes, you can upgrade or downgrade at any time. Changes take effect immediately.</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Is there a free trial?</h3>
              <p className="text-gray-600 text-sm">Yes! Pro plan includes a 14-day free trial. No credit card required.</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600 text-sm">We accept all major credit cards and PayPal through Stripe.</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600 text-sm">Absolutely! Cancel anytime from your account settings. No questions asked.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
