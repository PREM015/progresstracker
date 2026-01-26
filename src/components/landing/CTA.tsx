import Button from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CTA() {
  return (
    <section className="py-24 px-4 bg-linear-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-heading">
          Ready to Track Your Coding Journey?
        </h2>
        <p className="text-xl text-blue-100 mb-8">
          Join 10,000+ developers already using CodeSync Pro to achieve their goals
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" variant="secondary" className="group">
              Start Free Today
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/demo">
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
              View Demo
            </Button>
          </Link>
        </div>
        <p className="text-blue-100 mt-6 text-sm">
          No credit card required • 14-day free trial • Cancel anytime
        </p>
      </div>
    </section>
  );
}