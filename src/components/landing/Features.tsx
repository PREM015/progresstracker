import {
  Zap,
  BarChart3,
  Target,
  Lock,
  RefreshCw,
  Users,
} from 'lucide-react';

const features = [
  {
    name: 'Auto-Sync',
    description: 'Automatically sync data from 50+ platforms daily without manual entry.',
    icon: RefreshCw,
  },
  {
    name: 'Real-time Analytics',
    description: 'Beautiful charts and insights to track your progress over time.',
    icon: BarChart3,
  },
  {
    name: 'Goal Tracking',
    description: 'Set daily, weekly, or monthly goals and track your achievements.',
    icon: Target,
  },
  {
    name: 'Lightning Fast',
    description: 'Built with Next.js 14 for blazing fast performance and SEO.',
    icon: Zap,
  },
  {
    name: 'Privacy First',
    description: 'Your data is encrypted and never shared with third parties.',
    icon: Lock,
  },
  {
    name: 'Team Support',
    description: 'Share progress with mentors, track team members, and collaborate.',
    icon: Users,
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to track progress
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            All the features you need to stay consistent and reach your goals faster.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="relative rounded-2xl border bg-card p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.name}</h3>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}