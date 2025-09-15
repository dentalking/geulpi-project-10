'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface SafeCenteredModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export function SafeCenteredModal({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  className = ''
}: SafeCenteredModalProps) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateDimensions = () => {
      // 실제 뷰포트 높이 계산 (모바일 브라우저 주소창 고려)
      const vh = window.innerHeight;
      setViewportHeight(vh);
      setIsMobile(window.innerWidth < 768);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);

  // 사이즈별 너비 설정
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full'
  };

  // 모바일과 데스크톱에 따른 다른 스타일
  const modalStyle = isMobile ? {
    maxHeight: `${viewportHeight * 0.9}px`, // 뷰포트의 90%
    height: 'auto',
    margin: '20px'
  } : {
    maxHeight: '85vh',
    height: 'auto'
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
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            aria-hidden="true"
          />

          {/* Modal Container - 안전한 중앙 정렬 */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 lg:p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className={`
                  relative w-full ${sizeClasses[size]}
                  bg-white dark:bg-gray-900
                  rounded-xl shadow-2xl
                  overflow-hidden
                  ${className}
                `}
                style={modalStyle}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                {title && (
                  <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {title}
                      </h2>
                      <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Close modal"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Content - 스크롤 가능 영역 */}
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
                  {children}
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// 모달 헤더 컴포넌트
export function ModalHeader({
  title,
  onClose,
  className = ''
}: {
  title: string;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div className={`sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

// 모달 바디 컴포넌트
export function ModalBody({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-4 sm:px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

// 모달 푸터 컴포넌트
export function ModalFooter({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}