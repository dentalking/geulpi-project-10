'use client';

import { motion } from 'framer-motion';

export function MinimalEmptyState() {
  const today = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        {/* Current month and year */}
        <div className="mb-8">
          <h2 className="text-3xl font-light" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
            {monthNames[today.getMonth()]} {today.getFullYear()}
          </h2>
        </div>
        
        {/* Simple calendar grid visualization */}
        <div className="grid grid-cols-7 gap-3 max-w-sm mx-auto mb-8">
          {dayNames.map((day, index) => (
            <div
              key={day}
              className="text-xs font-medium text-center"
              style={{ color: 'var(--text-tertiary)', opacity: 0.5 }}
            >
              {day}
            </div>
          ))}
          {Array.from({ length: 35 }, (_, i) => {
            const dayNum = i - today.getDay() + 1;
            const isToday = dayNum === today.getDate();
            const isCurrentMonth = dayNum > 0 && dayNum <= new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: isCurrentMonth ? 0.3 : 0.1 }}
                transition={{ delay: i * 0.01 }}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm ${
                  isToday ? 'font-bold' : 'font-light'
                }`}
                style={{
                  background: isToday ? 'var(--accent-primary)' : 'var(--surface-secondary)',
                  color: isToday ? 'white' : 'var(--text-tertiary)',
                  opacity: isToday ? 1 : isCurrentMonth ? 0.3 : 0.1
                }}
              >
                {isCurrentMonth ? dayNum : ''}
              </motion.div>
            );
          })}
        </div>
        
        {/* Subtle text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.5 }}
          className="text-sm"
          style={{ color: 'var(--text-tertiary)' }}
        >
          No events scheduled
        </motion.p>
      </motion.div>
    </div>
  );
}