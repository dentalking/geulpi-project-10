import './globals.css';
import { ToastProvider } from '@/providers/ToastProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { EventProvider } from '@/contexts/EventContext';
import KeyboardShortcutsProvider from '@/components/KeyboardShortcutsProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import { SettingsInitializer } from '@/components/SettingsInitializer';
import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Geulpi AI Calendar Assistant',
  description: 'AI-powered smart calendar management system',
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Geulpi Calendar',
    title: 'Geulpi AI Calendar Assistant',
    description: 'AI-powered smart calendar management system',
  },
  twitter: {
    card: 'summary',
    title: 'Geulpi AI Calendar Assistant',
    description: 'AI-powered smart calendar management system',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-title': 'Geulpi Calendar',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <KeyboardShortcutsProvider>
            <ToastProvider>
              <EventProvider>
                {children}
                <KeyboardShortcutsModal />
              </EventProvider>
            </ToastProvider>
          </KeyboardShortcutsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
