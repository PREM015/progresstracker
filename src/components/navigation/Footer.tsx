'use client';

import React from 'react';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  className = '',
}) => {
  const sections = [
    {
      title: 'Product',
      links: [{ label: 'Features', href: '/features' }, { label: 'Pricing', href: '/pricing' }, { label: 'FAQ', href: '/faq' }],
    },
    {
      title: 'Company',
      links: [{ label: 'About', href: '/about' }, { label: 'Blog', href: '/blog' }, { label: 'Careers', href: '/careers' }],
    },
    {
      title: 'Support',
      links: [{ label: 'Help Center', href: '/help' }, { label: 'Contact', href: '/contact' }, { label: 'Status', href: '/status' }],
    },
    {
      title: 'Legal',
      links: [{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }, { label: 'Security', href: '/security' }],
    },
  ];

  return (
    <footer className={`bg-gray-900 text-white py-16 ${className}`}>
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-8 mb-12">
          <div>
            <div className="text-2xl font-bold mb-4">Progress Tracker</div>
            <p className="text-gray-400 text-sm">Track your progress, achieve your goals</p>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="font-bold mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-gray-400 hover:text-white text-sm">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-8 flex items-center justify-between text-sm text-gray-400">
          <div>© 2024 Progress Tracker. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white">Twitter</a>
            <a href="#" className="hover:text-white">GitHub</a>
            <a href="#" className="hover:text-white">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
