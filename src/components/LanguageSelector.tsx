'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { routing, localeNames, type Locale } from '@/i18n/config';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function LanguageSelector() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check for saved language preference on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('preferredLocale') as Locale;
    
    // Only redirect if saved locale differs from current locale
    if (savedLocale && savedLocale !== locale && routing.locales.includes(savedLocale)) {
      // Check if we're not already on the saved locale path
      const segments = pathname?.split('/').filter(Boolean) || [];
      const currentLocale = segments.find(segment => routing.locales.includes(segment as Locale));
      
      if (currentLocale !== savedLocale) {
        const localeIndex = segments.findIndex(segment => routing.locales.includes(segment as Locale));
        
        if (localeIndex !== -1) {
          segments[localeIndex] = savedLocale;
        } else {
          segments.unshift(savedLocale);
        }
        
        const newPath = segments.length > 0 ? segments.join('/') : savedLocale;
        router.replace(`/${newPath}`);
      }
    }
  }, []); // Run only on mount

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    // Save language preference to localStorage
    localStorage.setItem('preferredLocale', newLocale);
    
    // Remove the current locale from the path and add the new one
    const segments = pathname?.split('/').filter(Boolean) || [];
    const localeIndex = segments.findIndex(segment => routing.locales.includes(segment as Locale));
    
    if (localeIndex !== -1) {
      segments[localeIndex] = newLocale;
    } else {
      // If no locale in path, prepend it
      segments.unshift(newLocale);
    }
    
    // Ensure we always have a valid path with proper fallback
    const newPath = segments.length > 0 ? segments.join('/') : newLocale;
    
    // Use router.replace for smoother transition without adding to history
    router.replace(`/${newPath}`);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm font-medium text-white/90 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm border border-white/20"
        aria-label={`Current language: ${localeNames[locale]}. Click to change language`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        id="language-selector-button"
      >
        <Globe className="w-4 h-4" />
        <span>{localeNames[locale]}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-40 py-2 bg-black/90 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 z-50" role="menu" aria-labelledby="language-selector-button">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc as Locale)}
              className={`w-full px-4 py-3 min-h-[44px] text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2 ${
                locale === loc ? 'text-white font-medium bg-white/5' : 'text-white/70'
              }`}
              role="menuitem"
              aria-current={locale === loc ? 'true' : 'false'}
              aria-label={`Change language to ${localeNames[loc as Locale]}`}
            >
              {locale === loc && (
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              <span className={locale !== loc ? 'ml-6' : ''}>{localeNames[loc as Locale]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}