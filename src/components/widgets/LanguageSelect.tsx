/**
 * Component: LanguageSelect
 * Location: components/widgets/LanguageSelect.tsx
 * 
 * Description: Language/locale selector dropdown
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';

export interface Language {
  code: string;
  name: string;
  nativeName?: string;
  flag?: string;
}

export interface LanguageSelectProps {
  languages?: Language[];
  value?: string;
  onChange?: (code: string) => void;
  showFlag?: boolean;
  showNativeName?: boolean;
  variant?: 'dropdown' | 'buttons';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const defaultLanguages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
);

const STORAGE_KEY = 'language';

export const LanguageSelect: React.FC<LanguageSelectProps> = ({
  languages = defaultLanguages,
  value: controlledValue,
  onChange,
  showFlag = true,
  showNativeName = false,
  variant = 'dropdown',
  size = 'md',
  className,
}) => {
  const [mounted, setMounted] = useState(false);
  const [internalValue, setInternalValue] = useState<string>('en');

  const value = controlledValue ?? internalValue;
  const selectedLanguage = languages.find(l => l.code === value) || languages[0];

  const handleChange = useCallback((code: string) => {
    setInternalValue(code);
    localStorage.setItem(STORAGE_KEY, code);
    onChange?.(code);

    // Set html lang attribute
    document.documentElement.lang = code;
  }, [onChange]);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && languages.some(l => l.code === stored)) {
      setInternalValue(stored);
      document.documentElement.lang = stored;
    }
  }, [languages]);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={className} disabled>
        <GlobeIcon />
      </Button>
    );
  }

  // Buttons variant
  if (variant === 'buttons') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={value === lang.code ? 'primary' : 'ghost'}
            size={size === 'sm' ? 'sm' : 'md'}
            onClick={() => handleChange(lang.code)}
            className="min-w-0"
          >
            {showFlag && lang.flag && <span className="mr-1">{lang.flag}</span>}
            {lang.code.toUpperCase()}
          </Button>
        ))}
      </div>
    );
  }

  // Dropdown variant
  const items: DropdownItem[] = languages.map((lang) => ({
    value: lang.code,
    label: showNativeName && lang.nativeName ? `${lang.name} (${lang.nativeName})` : lang.name,
    icon: showFlag && lang.flag ? <span className="text-base">{lang.flag}</span> : undefined,
  }));

  return (
    <Dropdown
      trigger={
        <Button variant="ghost" size={size === 'sm' ? 'sm' : 'md'} className={className}>
          {showFlag && selectedLanguage?.flag && <span className="mr-2">{selectedLanguage.flag}</span>}
          {size !== 'sm' && <span>{selectedLanguage?.code.toUpperCase()}</span>}
          {size === 'sm' && !selectedLanguage?.flag && <GlobeIcon />}
        </Button>
      }
      items={items}
      onSelect={handleChange}
    />
  );
};

// Utility to get browser language
export const getBrowserLanguage = (): string => {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language.split('-')[0];
  return lang || 'en';
};

export default LanguageSelect;
