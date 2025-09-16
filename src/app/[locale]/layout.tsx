import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/config';
import ErrorBoundary from '@/components/ErrorBoundary';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: { locale }
}: {
  params: { locale: string }
}) {
  return {
    title: locale === 'ko' ? 'AI Calendar Assistant' : 'AI Calendar Assistant',
    description: locale === 'ko' 
      ? 'AI가 당신의 일정을 똑똑하게 관리합니다' 
      : 'AI manages your schedule intelligently'
  };
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validate that the incoming locale is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Load messages directly based on the locale parameter
  // This ensures the correct language is loaded
  let messages;
  try {
    messages = (await import(`../../../messages/${locale}.json`)).default;
  } catch (error) {
    console.error('Failed to import messages for locale:', locale, error);
    // Fallback to Korean if the locale file doesn't exist
    messages = (await import(`../../../messages/ko.json`)).default;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </NextIntlClientProvider>
  );
}