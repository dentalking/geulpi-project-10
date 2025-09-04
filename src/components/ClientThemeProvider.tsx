'use client';

import { ThemeProvider } from '@/providers/ThemeProvider';

export default function ClientThemeProvider({
  children
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}