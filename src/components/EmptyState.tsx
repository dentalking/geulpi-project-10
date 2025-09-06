'use client';

import { motion } from 'framer-motion';
import { Calendar, Sparkles, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface EmptyStateProps {
  onAddEvent: () => void;
}

export function EmptyState({ onAddEvent }: EmptyStateProps) {
  const t = useTranslations();

  const features = [
    { text: 'Voice: "Meeting tomorrow at 3pm"' },
    { text: 'Scan screenshots for schedules' },
    { text: 'AI suggests the best times' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
    >
      {/* Animated Icon */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          repeatType: "reverse"
        }}
        className="mb-6"
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Calendar className="w-12 h-12 text-white" />
        </div>
      </motion.div>

      {/* Welcome Message */}
      <h2 className="text-2xl font-bold mb-2">Your calendar is ready!</h2>
      <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
        Add your first event to get started
      </p>

      {/* CTA Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAddEvent}
        className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium flex items-center gap-2 shadow-lg"
      >
        <Sparkles className="w-5 h-5" />
        Add Your First Event
        <ArrowRight className="w-5 h-5" />
      </motion.button>

      {/* Feature Pills */}
      <div className="mt-12 space-y-3">
        <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Quick ways to add events:
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="px-4 py-2 rounded-full flex items-center gap-2"
              style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--border-default)'
              }}
            >
              <span className="text-sm">{feature.text}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Today's Date */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-sm"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </motion.div>
    </motion.div>
  );
}