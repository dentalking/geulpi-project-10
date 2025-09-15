'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, AlertTriangle, XCircle, Info, 
  Loader2, Zap, Calendar, Users, Clock, 
  Wifi, WifiOff, RefreshCw, Shield, Star
} from 'lucide-react';

// 피드백 타입 정의
export type FeedbackType = 
  | 'success' | 'error' | 'warning' | 'info' | 'loading' | 'processing'
  | 'sync' | 'offline' | 'auth' | 'achievement';

export type FeedbackContext = 
  | 'calendar' | 'event' | 'user' | 'system' | 'ai' | 'sync' | 'general';

export interface SmartFeedbackConfig {
  type: FeedbackType;
  context: FeedbackContext;
  message: string;
  description?: string;
  duration?: number;
  haptic?: boolean;
  sound?: boolean;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  progress?: number; // 0-100 for loading states
  metadata?: Record<string, any>;
}

// 피드백별 아이콘 맵핑
const FeedbackIcons: Record<FeedbackType, React.ComponentType<any>> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
  processing: Loader2,
  sync: RefreshCw,
  offline: WifiOff,
  auth: Shield,
  achievement: Star
};

// 피드백별 색상 맵핑
const FeedbackColors: Record<FeedbackType, {
  bg: string;
  border: string;
  icon: string;
  text: string;
}> = {
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'text-green-400',
    text: 'text-green-100'
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    text: 'text-red-100'
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: 'text-yellow-400',
    text: 'text-yellow-100'
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    text: 'text-blue-100'
  },
  loading: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-400',
    text: 'text-purple-100'
  },
  processing: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-400',
    text: 'text-purple-100'
  },
  sync: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    icon: 'text-cyan-400',
    text: 'text-cyan-100'
  },
  offline: {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    icon: 'text-gray-400',
    text: 'text-gray-100'
  },
  auth: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    icon: 'text-indigo-400',
    text: 'text-indigo-100'
  },
  achievement: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: 'text-yellow-400',
    text: 'text-yellow-100'
  }
};

// 컨텍스트별 맞춤 메시지 생성
export class SmartFeedbackGenerator {
  private static contextMessages: Record<FeedbackContext, Record<FeedbackType, (data?: any) => string>> = {
    calendar: {
      success: (data) => data?.count ? `${data.count}개 일정을 성공적으로 로드했습니다` : '캘린더 로딩 완료',
      loading: () => '일정을 불러오는 중...',
      processing: () => '캘린더 데이터를 처리하는 중...',
      sync: () => 'Google 캘린더와 동기화 중...',
      error: () => '캘린더 데이터를 불러올 수 없습니다',
      offline: () => '오프라인 모드 - 저장된 데이터 표시',
      info: () => '캘린더 정보',
      warning: () => '캘린더 경고',
      auth: () => '캘린더 인증 중',
      achievement: () => '캘린더 업적 달성!'
    },
    event: {
      success: (data) => data?.action === 'create' ? '일정이 생성되었습니다' : 
                         data?.action === 'update' ? '일정이 수정되었습니다' : 
                         data?.action === 'delete' ? '일정이 삭제되었습니다' : '일정 작업 완료',
      loading: (data) => data?.action === 'create' ? '일정을 생성하는 중...' : 
                          data?.action === 'update' ? '일정을 수정하는 중...' : 
                          data?.action === 'delete' ? '일정을 삭제하는 중...' : '일정 처리 중...',
      processing: (data) => data?.action === 'create' ? '일정 생성을 처리하는 중...' : 
                           data?.action === 'update' ? '일정 수정을 처리하는 중...' : 
                           data?.action === 'delete' ? '일정 삭제를 처리하는 중...' : '일정을 처리하는 중...',
      error: () => '일정 작업 중 오류가 발생했습니다',
      sync: () => '일정을 동기화하는 중...',
      offline: () => '오프라인 - 일정은 온라인 연결 시 동기화됩니다',
      info: () => '일정 정보',
      warning: () => '일정 충돌이 감지되었습니다',
      auth: () => '일정 권한 확인 중',
      achievement: () => '일정 관리 목표 달성!'
    },
    ai: {
      success: () => 'AI 응답이 생성되었습니다',
      loading: () => 'AI가 응답을 생성하는 중...',
      processing: () => '메시지를 분석하는 중...',
      error: () => 'AI 처리 중 오류가 발생했습니다',
      sync: () => 'AI 데이터를 동기화하는 중...',
      info: () => 'AI 도움말',
      warning: () => 'AI 처리에 시간이 걸릴 수 있습니다',
      offline: () => '오프라인 - AI 기능을 사용할 수 없습니다',
      auth: () => 'AI 서비스 인증 중',
      achievement: () => 'AI 어시스턴트 레벨업!'
    },
    user: {
      success: () => '프로필이 업데이트되었습니다',
      loading: () => '사용자 정보 로딩 중...',
      processing: () => '사용자 데이터를 처리하는 중...',
      error: () => '사용자 작업 중 오류 발생',
      auth: () => '사용자 인증 중...',
      info: () => '사용자 정보',
      warning: () => '계정 보안 점검이 필요합니다',
      offline: () => '오프라인 모드',
      sync: () => '사용자 설정 동기화 중',
      achievement: () => '새로운 배지를 획득했습니다!'
    },
    system: {
      success: () => '시스템 작업이 완료되었습니다',
      loading: () => '시스템 처리 중...',
      processing: () => '시스템 작업을 처리하는 중...',
      error: () => '시스템 오류가 발생했습니다',
      warning: () => '시스템 점검이 필요합니다',
      info: () => '시스템 알림',
      auth: () => '시스템 권한 확인 중',
      offline: () => '네트워크 연결 끊김',
      sync: () => '시스템 동기화 중',
      achievement: () => '시스템 목표 달성!'
    },
    sync: {
      success: (data) => `${data?.count || 0}개 항목이 동기화되었습니다`,
      loading: () => '동기화 진행 중...',
      processing: () => '동기화 데이터를 처리하는 중...',
      error: () => '동기화 실패',
      warning: () => '일부 항목의 동기화가 지연되고 있습니다',
      info: () => '동기화 정보',
      auth: () => '동기화 권한 확인 중',
      offline: () => '오프라인 - 동기화 대기 중',
      sync: () => '실시간 동기화 중',
      achievement: () => '완벽한 동기화 달성!'
    },
    general: {
      success: () => '작업이 성공적으로 완료되었습니다',
      loading: () => '처리 중...',
      processing: () => '데이터를 처리하는 중...',
      error: () => '오류가 발생했습니다',
      warning: () => '주의가 필요합니다',
      info: () => '정보',
      auth: () => '인증 중...',
      offline: () => '오프라인 상태',
      sync: () => '동기화 중',
      achievement: () => '축하합니다!'
    }
  };

  static generate(context: FeedbackContext, type: FeedbackType, data?: any): string {
    const contextMap = this.contextMessages[context];
    const generator = contextMap?.[type];
    return generator ? generator(data) : `${type} in ${context}`;
  }

  static generateDescription(context: FeedbackContext, type: FeedbackType, data?: any): string {
    const descriptions: Record<string, string> = {
      'calendar-success': '모든 일정이 최신 상태로 업데이트되었습니다',
      'calendar-loading': '일정 데이터를 Google 캘린더에서 가져오고 있습니다',
      'event-success': '변경사항이 저장되고 모든 기기에 동기화되었습니다',
      'event-loading': '잠시만 기다려주세요',
      'ai-loading': '최적의 답변을 생성하기 위해 분석 중입니다',
      'sync-success': '모든 데이터가 최신 상태입니다'
    };
    
    return descriptions[`${context}-${type}`] || '';
  }
}

// 햅틱 피드백 함수
function triggerHaptic(type: FeedbackType) {
  if (!navigator.vibrate) return;
  
  const patterns: Record<FeedbackType, number | number[]> = {
    success: [100, 50, 100],
    error: [200, 100, 200],
    warning: [150],
    info: [50],
    loading: [25],
    processing: [25],
    sync: [50, 25, 50],
    offline: [100],
    auth: [75, 50, 75],
    achievement: [100, 50, 100, 50, 200]
  };
  
  navigator.vibrate(patterns[type] || 50);
}

// 메인 SmartFeedback 컴포넌트
interface SmartFeedbackProps {
  config: SmartFeedbackConfig;
  isVisible: boolean;
  onDismiss?: () => void;
  position?: 'top' | 'bottom' | 'center';
  variant?: 'toast' | 'inline' | 'modal';
}

// Simplified props for easier usage
interface SmartFeedbackSimpleProps {
  type: FeedbackType;
  message: string;
  context?: any;
  variant?: 'toast' | 'inline' | 'modal' | 'compact';
  showIcon?: boolean;
  autoHide?: boolean;
  className?: string;
}

export function SmartFeedback({
  config,
  isVisible,
  onDismiss,
  position = 'top',
  variant = 'toast'
}: SmartFeedbackProps) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const colors = FeedbackColors[config.type];
  const Icon = FeedbackIcons[config.type];

  // 햅틱 피드백 트리거
  useEffect(() => {
    if (isVisible && config.haptic) {
      triggerHaptic(config.type);
    }
  }, [isVisible, config.haptic, config.type]);

  // 자동 해제
  useEffect(() => {
    if (isVisible && config.duration && !config.persistent) {
      timeoutRef.current = setTimeout(() => {
        onDismiss?.();
      }, config.duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, config.duration, config.persistent, onDismiss]);

  const positionClasses = {
    top: 'top-4',
    bottom: 'bottom-4',
    center: 'top-1/2 -translate-y-1/2'
  };

  const variantClasses = {
    toast: `fixed ${positionClasses[position]} right-4 z-50 max-w-sm`,
    inline: 'relative w-full',
    modal: 'fixed inset-0 z-50 flex items-center justify-center p-4'
  };

  if (variant === 'modal') {
    return (
      <AnimatePresence>
        {isVisible && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={onDismiss}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className={`max-w-md w-full rounded-2xl border p-6 backdrop-blur-xl ${colors.bg} ${colors.border}`}>
                <div className="flex items-start gap-4">
                  <motion.div
                    animate={{ 
                      rotate: config.type === 'loading' ? 360 : 0,
                      scale: config.type === 'success' ? [1, 1.2, 1] : 1
                    }}
                    transition={{ 
                      rotate: { duration: 1, repeat: config.type === 'loading' ? Infinity : 0, ease: 'linear' },
                      scale: { duration: 0.5 }
                    }}
                    className={`${colors.icon}`}
                  >
                    <Icon size={24} />
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{config.message}</h3>
                    {config.description && (
                      <p className="text-sm opacity-80 text-white/70">{config.description}</p>
                    )}
                    {config.progress !== undefined && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/60">진행률</span>
                          <span className="text-white/80">{config.progress}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${config.progress}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    )}
                    {config.actions && (
                      <div className="flex gap-2 mt-4">
                        {config.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={action.onClick}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              action.variant === 'primary' 
                                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                                : action.variant === 'danger'
                                ? 'bg-red-500 hover:bg-red-600 text-white'  
                                : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: variant === 'toast' ? 300 : 0, y: variant === 'inline' ? -20 : 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: variant === 'toast' ? 300 : 0, y: variant === 'inline' ? -10 : 0 }}
          className={`${variantClasses[variant]} rounded-xl border backdrop-blur-xl ${colors.bg} ${colors.border}`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-3 p-4">
            <motion.div
              animate={{ 
                rotate: config.type === 'loading' || config.type === 'sync' ? 360 : 0,
                scale: config.type === 'success' ? [1, 1.1, 1] : 1
              }}
              transition={{ 
                rotate: { duration: 1, repeat: (config.type === 'loading' || config.type === 'sync') ? Infinity : 0, ease: 'linear' },
                scale: { duration: 0.6 }
              }}
              className={`${colors.icon} flex-shrink-0`}
            >
              <Icon size={20} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${colors.text}`}>{config.message}</p>
              {config.description && (
                <p className="text-xs mt-1 opacity-75 text-white/60">{config.description}</p>
              )}
              {config.progress !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-white/10 rounded-full h-1">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${config.progress}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </div>
            {!config.persistent && (
              <button
                onClick={onDismiss}
                className="text-white/40 hover:text-white/60 transition-colors flex-shrink-0"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 사용 편의를 위한 Hook
export function useSmartFeedback() {
  const [feedbacks, setFeedbacks] = React.useState<Array<SmartFeedbackConfig & { id: string }>>([]);

  const show = useCallback((config: Omit<SmartFeedbackConfig, 'message'> & { message?: string }) => {
    const id = Date.now().toString();
    const message = config.message || SmartFeedbackGenerator.generate(config.context, config.type, config.metadata);
    const description = config.description || SmartFeedbackGenerator.generateDescription(config.context, config.type, config.metadata);
    
    setFeedbacks(prev => [...prev, { ...config, id, message, description }]);
    
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  }, []);

  const clear = useCallback(() => {
    setFeedbacks([]);
  }, []);

  return {
    feedbacks,
    show,
    dismiss,
    clear
  };
}

// Simplified SmartFeedback component for easier usage
export function SmartFeedbackSimple({
  type,
  message,
  context,
  variant = 'inline',
  showIcon = true,
  autoHide = true,
  className = ''
}: SmartFeedbackSimpleProps) {
  const colors = FeedbackColors[type];
  const Icon = FeedbackIcons[type];

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-xl ${colors.bg} ${colors.border} ${className}`}>
        {showIcon && (
          <motion.div
            animate={{ 
              rotate: type === 'loading' || type === 'processing' || type === 'sync' ? 360 : 0 
            }}
            transition={{ 
              duration: 1, 
              repeat: (type === 'loading' || type === 'processing' || type === 'sync') ? Infinity : 0, 
              ease: 'linear' 
            }}
            className={`${colors.icon} flex-shrink-0`}
          >
            <Icon size={16} />
          </motion.div>
        )}
        <span className={`text-sm font-medium ${colors.text}`}>{message}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border backdrop-blur-xl ${colors.bg} ${colors.border} ${className}`}>
      <div className="flex items-start gap-3 p-4">
        {showIcon && (
          <motion.div
            animate={{ 
              rotate: type === 'loading' || type === 'processing' || type === 'sync' ? 360 : 0,
              scale: type === 'success' ? [1, 1.1, 1] : 1
            }}
            transition={{ 
              rotate: { duration: 1, repeat: (type === 'loading' || type === 'processing' || type === 'sync') ? Infinity : 0, ease: 'linear' },
              scale: { duration: 0.6 }
            }}
            className={`${colors.icon} flex-shrink-0`}
          >
            <Icon size={20} />
          </motion.div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${colors.text}`}>{message}</p>
        </div>
      </div>
    </div>
  );
}