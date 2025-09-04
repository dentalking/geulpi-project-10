import './globals.css';
import { ToastProvider } from '@/providers/ToastProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import KeyboardShortcutsProvider from '@/components/KeyboardShortcutsProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <KeyboardShortcutsProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </KeyboardShortcutsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
