// ============================================================================
// FILE: src/components/navigation/Footer.tsx
// PURPOSE: Site footer with links and legal info
// ============================================================================

import Link from 'next/link';
import { Github, Twitter, Linkedin } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/40 transition-colors">
      <div className="container py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Social */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-primary text-primary-foreground p-1 rounded-md text-sm">PT</span>
              ProgressTracker
            </h4>
            <p className="text-sm text-muted-foreground">
              Track your coding journey across platforms. Gain insights, set goals, and improve daily.
            </p>
            <div className="flex gap-4">
              <Link href="https://github.com" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
              <Link href="https://twitter.com" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href="https://linkedin.com" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Link>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href={PUBLIC_ROUTES.FEATURES} className="text-muted-foreground hover:text-foreground">Features</Link></li>
              <li><Link href={PUBLIC_ROUTES.PRICING} className="text-muted-foreground hover:text-foreground">Pricing</Link></li>
              <li><Link href="/changelog" className="text-muted-foreground hover:text-foreground">Changelog</Link></li>
              <li><Link href="/roadmap" className="text-muted-foreground hover:text-foreground">Roadmap</Link></li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href={PUBLIC_ROUTES.BLOG} className="text-muted-foreground hover:text-foreground">Blog</Link></li>
              <li><Link href="/docs" className="text-muted-foreground hover:text-foreground">Documentation</Link></li>
              <li><Link href="/community" className="text-muted-foreground hover:text-foreground">Community</Link></li>
              <li><Link href="/help" className="text-muted-foreground hover:text-foreground">Help Center</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
              <li><Link href="/cookies" className="text-muted-foreground hover:text-foreground">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-10 pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} ProgressTracker. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
