'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { SocketProvider } from './SocketProvider';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </QueryProvider>
  );
}