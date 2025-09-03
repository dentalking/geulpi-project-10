'use client';

import { AppProviders } from '@/providers/AppProviders';

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      {children}
    </AppProviders>
  );
}