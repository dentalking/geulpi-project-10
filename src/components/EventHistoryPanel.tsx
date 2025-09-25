'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  Upload,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import { formatHistoryEntry } from '@/hooks/useEventHistory';
import { HistoryEntry } from '@/lib/EventHistoryManager';

interface EventHistoryPanelProps {
  entries: HistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  onImport: (data: string) => void;
  locale: 'ko' | 'en';
}

export function EventHistoryPanel({
  entries,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onExport,
  onImport,
  locale
}: EventHistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const recentEntries = entries.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold">
            {locale === 'ko' ? '변경 기록' : 'History'}
          </h3>
          <span className="text-sm text-gray-500">
            ({entries.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo Button */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-all ${
              canUndo
                ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
            title={locale === 'ko' ? '실행 취소 (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Redo Button */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-all ${
              canRedo
                ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
            title={locale === 'ko' ? '다시 실행 (Ctrl+Shift+Z)' : 'Redo (Ctrl+Shift+Z)'}
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* More Actions */}
          <div className="border-l border-gray-200 dark:border-gray-700 pl-2 ml-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {locale === 'ko' ? '변경 기록이 없습니다' : 'No history'}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {(isExpanded ? entries : recentEntries).map((entry, index) => {
              const formatted = formatHistoryEntry(entry, locale);
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="text-2xl">{formatted.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {formatted.title}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatted.time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {formatted.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {!isExpanded && entries.length > 5 && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 py-2"
          >
            {locale === 'ko'
              ? `${entries.length - 5}개 더 보기`
              : `Show ${entries.length - 5} more`}
          </button>
        )}
      </div>

      {/* Actions (Expanded) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-4 flex gap-2">
              <button
                onClick={onClear}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {locale === 'ko' ? '기록 삭제' : 'Clear History'}
              </button>

              <button
                onClick={onExport}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                {locale === 'ko' ? '내보내기' : 'Export'}
              </button>

              <button
                onClick={() => setShowImportDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                {locale === 'ko' ? '가져오기' : 'Import'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Dialog */}
      <AnimatePresence>
        {showImportDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowImportDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">
                {locale === 'ko' ? '기록 가져오기' : 'Import History'}
              </h3>

              <textarea
                className="w-full h-32 p-2 border border-gray-300 dark:border-gray-700 rounded-lg resize-none"
                placeholder={locale === 'ko' ? 'JSON 데이터를 붙여넣으세요' : 'Paste JSON data here'}
                onChange={(e) => {
                  // Handle import
                  try {
                    onImport(e.target.value);
                    setShowImportDialog(false);
                  } catch (error) {
                    // Handle error
                  }
                }}
              />

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowImportDialog(false)}
                  className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  {locale === 'ko' ? '취소' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}