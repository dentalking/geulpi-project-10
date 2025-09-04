import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['ko', 'en'],
  // Used when no locale matches
  defaultLocale: 'ko'
});

export type Locale = (typeof routing.locales)[number];

export const localeNames: Record<Locale, string> = {
  ko: '한국어',
  en: 'English'
};