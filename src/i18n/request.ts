import {getRequestConfig} from 'next-intl/server';
import {routing} from './config';

export default getRequestConfig(async ({requestLocale}) => {
  // Wait for the requested locale
  const requested = await requestLocale;
  
  // Validate that the incoming locale is supported
  const locale = (requested && routing.locales.includes(requested as any))
    ? requested 
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});