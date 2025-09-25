'use client';

import { motion } from 'framer-motion';
import { CalendarEvent } from '@/types';
import { ArrowRight, Plus, Minus, Edit } from 'lucide-react';

interface EventDiffViewProps {
  original: CalendarEvent;
  changes: Partial<CalendarEvent>;
  locale: 'ko' | 'en';
}

export function EventDiffView({ original, changes, locale }: EventDiffViewProps) {
  const formatValue = (value: any): string => {
    if (!value) return locale === 'ko' ? '(없음)' : '(none)';
    if (typeof value === 'object' && value.dateTime) {
      return new Date(value.dateTime).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US');
    }
    if (typeof value === 'object' && value.date) {
      return new Date(value.date).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US');
    }
    return String(value);
  };

  const getDiffFields = () => {
    const fields: {
      key: string;
      label: string;
      oldValue: any;
      newValue: any;
      type: 'added' | 'removed' | 'modified'
    }[] = [];

    const fieldLabels: Record<string, string> = locale === 'ko' ? {
      summary: '제목',
      description: '설명',
      location: '장소',
      start: '시작 시간',
      end: '종료 시간',
    } : {
      summary: 'Title',
      description: 'Description',
      location: 'Location',
      start: 'Start Time',
      end: 'End Time',
    };

    Object.keys(changes).forEach(key => {
      const oldValue = (original as any)[key];
      const newValue = (changes as any)[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        let type: 'added' | 'removed' | 'modified' = 'modified';
        if (!oldValue && newValue) type = 'added';
        else if (oldValue && !newValue) type = 'removed';

        fields.push({
          key,
          label: fieldLabels[key] || key,
          oldValue,
          newValue,
          type
        });
      }
    });

    return fields;
  };

  const diffFields = getDiffFields();

  if (diffFields.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        {locale === 'ko' ? '변경사항이 없습니다' : 'No changes'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <Edit className="w-4 h-4" />
        {locale === 'ko' ? '변경사항 미리보기' : 'Change Preview'}
      </h3>

      {diffFields.map(({ key, label, oldValue, newValue, type }, index) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3"
        >
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            {label}
          </div>

          <div className="flex items-center gap-3">
            {type === 'added' ? (
              <>
                <div className="flex-1">
                  <span className="text-gray-400 italic">
                    {locale === 'ko' ? '(없음)' : '(none)'}
                  </span>
                </div>
                <Plus className="w-4 h-4 text-green-500" />
                <div className="flex-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded text-green-700 dark:text-green-300">
                  {formatValue(newValue)}
                </div>
              </>
            ) : type === 'removed' ? (
              <>
                <div className="flex-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded text-red-700 dark:text-red-300 line-through">
                  {formatValue(oldValue)}
                </div>
                <Minus className="w-4 h-4 text-red-500" />
                <div className="flex-1">
                  <span className="text-gray-400 italic">
                    {locale === 'ko' ? '(삭제됨)' : '(removed)'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded text-gray-600 dark:text-gray-400 line-through">
                  {formatValue(oldValue)}
                </div>
                <ArrowRight className="w-4 h-4 text-blue-500" />
                <div className="flex-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300 font-medium">
                  {formatValue(newValue)}
                </div>
              </>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}