'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Camera, Type, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: string) => void;
}

export function QuickAddSheet({ isOpen, onClose, onSelectOption }: QuickAddSheetProps) {
  const t = useTranslations();

  const quickAddOptions = [
    {
      icon: Type,
      label: 'Type Event',
      description: 'Manually enter event details',
      action: 'type',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Mic,
      label: 'Voice Input',
      description: 'Say "Meeting tomorrow at 3pm"',
      action: 'voice',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Camera,
      label: 'Scan Image',
      description: 'Extract schedule from screenshot',
      action: 'scan',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Calendar,
      label: 'Quick Event',
      description: 'Add to today with one tap',
      action: 'quick',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{ background: 'var(--bg-primary)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div 
                className="w-12 h-1 rounded-full"
                style={{ background: 'var(--border-default)' }}
              />
            </div>

            {/* Header */}
            <div className="px-6 pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Add Event</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{ background: 'var(--surface-secondary)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Choose how you'd like to add your event
              </p>
            </div>

            {/* Options Grid */}
            <div className="px-6 pb-8 grid grid-cols-2 gap-4">
              {quickAddOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.action}
                    onClick={() => {
                      onSelectOption(option.action);
                      onClose();
                    }}
                    className="p-4 rounded-2xl text-left transition-all transform active:scale-95"
                    style={{
                      background: 'var(--surface-secondary)',
                      border: '1px solid var(--border-default)'
                    }}
                  >
                    <div 
                      className={`w-12 h-12 rounded-xl bg-gradient-to-r ${option.color} flex items-center justify-center mb-3`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-medium mb-1">{option.label}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Safe area for iOS */}
            <div className="pb-safe" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}