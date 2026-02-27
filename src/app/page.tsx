import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Stats from "@/components/landing/Stats";
import Testimonials from "@/components/landing/Testimonials";
import PricingSection from "@/components/landing/PricingSection";
import FAQ from "@/components/landing/FAQ";
import CTASection from "@/components/landing/CTASection";
import Platforms from "@/components/landing/Platforms";
import Newsletter from "@/components/landing/Newsletter";
import { PublicLayout } from "@/components/layouts/PublicLayout";

export default function HomePage() {
  return (
    <PublicLayout>
      <Hero />
      <Features />
      <HowItWorks />
      <Platforms />
      <Stats />
      <Testimonials />
      <PricingSection />
      <FAQ />
      <Newsletter />
      <CTASection />
    </PublicLayout>
  );
}