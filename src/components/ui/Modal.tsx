'use client';

import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  className = ''
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnBackdrop ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            } : undefined}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] pointer-events-auto cursor-pointer"
          />
          
          {/* Modal Container - Centered */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={(e) => {
                e.stopPropagation(); // Prevent backdrop click when clicking inside modal
              }}
              className={`w-full ${sizeClasses[size]} max-h-[90vh] pointer-events-auto ${className}`}
            >
              <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl shadow-2xl border border-gray-800/50 overflow-hidden flex flex-col h-full max-h-[90vh]">
                {/* Header */}
                {(title || showCloseButton) && (
                  <div className="relative px-6 py-4 border-b border-gray-800/50">
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-blue-600/5 to-cyan-600/5" />
                    
                    <div className="relative flex items-start justify-between">
                      <div>
                        {title && (
                          <h2 className="text-xl font-semibold text-white">
                            {title}
                          </h2>
                        )}
                        {description && (
                          <p className="mt-1 text-sm text-gray-400">
                            {description}
                          </p>
                        )}
                      </div>
                      
                      {showCloseButton && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                          }}
                          className="ml-4 p-2 rounded-lg hover:bg-white/10 transition-colors group pointer-events-auto"
                          title="Close"
                          style={{ minWidth: '36px', minHeight: '36px' }}
                        >
                          <X className="w-5 h-5 text-gray-400 group-hover:text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  {children}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Modal Body Component for consistent padding
export function ModalBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

// Modal Footer Component for action buttons
export function ModalFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-t border-gray-800/50 bg-gray-900/50 ${className}`}>
      {children}
    </div>
  );
}