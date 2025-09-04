import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default function RootPage() {
  // Get accept-language header to determine user's preferred language
  const headersList = headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  
  // Simple language detection (you can make this more sophisticated)
  const preferredLocale = acceptLanguage.includes('en') ? 'en' : 'ko';
  
  // Redirect to the appropriate locale
  redirect(`/${preferredLocale}`);
}