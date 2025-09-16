import './globals.css';
import { ToastProvider } from '@/providers/ToastProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import KeyboardShortcutsProvider from '@/components/KeyboardShortcutsProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Geulpi AI Calendar Assistant',
  description: 'AI-powered smart calendar management system',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Geulpi Calendar',
  },
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
      <head>
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <KeyboardShortcutsProvider>
            <ToastProvider>
              {children}
              <KeyboardShortcutsModal />
            </ToastProvider>
          </KeyboardShortcutsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
