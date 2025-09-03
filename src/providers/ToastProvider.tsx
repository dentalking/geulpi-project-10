'use client';

import React, { createContext, useContext } from 'react';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

interface ToastContextType {
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const { toasts, toast, removeToast } = useToast();

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};