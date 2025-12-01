import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import PlatformTable from '@/components/landing/PlatformTable';
import Testimonials from '@/components/landing/Testimonials';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import  Button from '@/components/ui/Button';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Simple Navbar */}
      <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold gradient-text">
            CodeSync Pro
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Sections */}
      <Hero />
      <Features />
      <PlatformTable />
      <Testimonials />

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl mb-4">
            Ready to track your progress?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of developers already using CodeSync Pro
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary">
              Start Free Today
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}