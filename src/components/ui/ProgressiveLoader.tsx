'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Loader2, Clock, Zap, Shield } from 'lucide-react';

// 프로그레시브 로딩 단계 정의
export type LoadingStage = 
  | 'initializing'    // 초기화 중
  | 'authenticating'  // 인증 중
  | 'loading'         // 데이터 로딩 중
  | 'processing'      // 처리 중
  | 'finalizing'      // 마무리 중
  | 'success'         // 성공
  | 'error';          // 오류

export interface LoadingStep {
  stage: LoadingStage;
  title: string;
  description: string;
  duration?: number;  // 예상 소요 시간 (ms)
  icon?: React.ComponentType<any>;
}

interface ProgressiveLoaderProps {
  steps: LoadingStep[];
  currentStage: LoadingStage;
  progress?: number;  // 0-100
  error?: string;
  onRetry?: () => void;
  showSteps?: boolean;
  variant?: 'minimal' | 'detailed' | 'compact';
  className?: string;
}

// 단계별 기본 아이콘
const StageIcons: Record<LoadingStage, React.ComponentType<any>> = {
  initializing: Clock,
  authenticating: Shield,
  loading: Loader2,
  processing: Zap,
  finalizing: Check,
  success: Check,
  error: AlertCircle
};

// 단계별 색상
const StageColors: Record<LoadingStage, string> = {
  initializing: 'text-blue-400',
  authenticating: 'text-green-400',
  loading: 'text-purple-400',
  processing: 'text-orange-400',
  finalizing: 'text-teal-400',
  success: 'text-green-500',
  error: 'text-red-500'
};

export function ProgressiveLoader({
  steps,
  currentStage,
  progress,
  error,
  onRetry,
  showSteps = true,
  variant = 'detailed',
  className = ''
}: ProgressiveLoaderProps) {
  const [completedStages, setCompletedStages] = useState<Set<LoadingStage>>(new Set());
  const [stageStartTimes, setStageStartTimes] = useState<Map<LoadingStage, number>>(new Map());

  // 현재 단계 업데이트
  useEffect(() => {
    if (currentStage === 'success') {
      setCompletedStages(prev => new Set([...prev, ...steps.map(s => s.stage)]));
    } else if (currentStage !== 'error') {
      const currentIndex = steps.findIndex(s => s.stage === currentStage);
      if (currentIndex >= 0) {
        const newCompleted = new Set<LoadingStage>();
        for (let i = 0; i < currentIndex; i++) {
          newCompleted.add(steps[i].stage);
        }
        setCompletedStages(newCompleted);
      }
    }
  }, [currentStage, steps]);

  // 단계별 시작 시간 기록
  useEffect(() => {
    setStageStartTimes(prev => new Map([...prev, [currentStage, Date.now()]]));
  }, [currentStage]);

  const currentStep = steps.find(step => step.stage === currentStage);
  const currentIndex = steps.findIndex(s => s.stage === currentStage);
  const totalSteps = steps.length;

  // 진행률 계산
  const calculateProgress = useCallback(() => {
    if (progress !== undefined) return progress;
    if (currentStage === 'success') return 100;
    if (currentStage === 'error') return 0;
    
    const baseProgress = (currentIndex / totalSteps) * 100;
    const stepProgress = 100 / totalSteps;
    
    // 현재 단계 내에서의 추가 진행률 시뮬레이션
    const stageStart = stageStartTimes.get(currentStage) || Date.now();
    const elapsed = Date.now() - stageStart;
    const stageDuration = currentStep?.duration || 2000;
    const stageProgress = Math.min((elapsed / stageDuration) * stepProgress, stepProgress * 0.8);
    
    return Math.min(baseProgress + stageProgress, 95);
  }, [progress, currentStage, currentIndex, totalSteps, currentStep, stageStartTimes]);

  const currentProgress = calculateProgress();

  // 최소형 버전
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="relative">
          <motion.div
            animate={{ rotate: currentStage === 'loading' || currentStage === 'processing' ? 360 : 0 }}
            transition={{ duration: 1, repeat: currentStage === 'loading' || currentStage === 'processing' ? Infinity : 0, ease: 'linear' }}
            className={`w-5 h-5 ${StageColors[currentStage]}`}
          >
            {React.createElement(currentStep?.icon || StageIcons[currentStage], { size: 20 })}
          </motion.div>
        </div>
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {currentStep?.title || currentStage}
        </span>
      </div>
    );
  }

  // 간단형 버전
  if (variant === 'compact') {
    return (
      <div className={`bg-white/5 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <motion.div
            animate={{ 
              rotate: ['loading', 'processing'].includes(currentStage) ? 360 : 0,
              scale: currentStage === 'success' ? [1, 1.2, 1] : 1
            }}
            transition={{ 
              rotate: { duration: 1, repeat: ['loading', 'processing'].includes(currentStage) ? Infinity : 0, ease: 'linear' },
              scale: { duration: 0.6 }
            }}
            className={`w-6 h-6 ${StageColors[currentStage]}`}
          >
            {React.createElement(currentStep?.icon || StageIcons[currentStage], { size: 24 })}
          </motion.div>
          <div className="flex-1">
            <div className="font-medium text-sm">{currentStep?.title}</div>
            <div className="text-xs opacity-70">{currentStep?.description}</div>
          </div>
          <div className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
            {Math.round(currentProgress)}%
          </div>
        </div>
        
        {/* 진행률 바 */}
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: '0%' }}
            animate={{ width: `${currentProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  // 상세형 버전 (기본)
  return (
    <div className={`bg-white/5 rounded-xl p-6 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            {error ? '오류 발생' : currentStep?.title || '로딩 중'}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {error || currentStep?.description || '잠시만 기다려주세요'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {Math.round(currentProgress)}%
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {currentIndex + 1} / {totalSteps}
          </div>
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="mb-6">
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: '0%' }}
            animate={{ width: `${currentProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* 단계별 표시 */}
      {showSteps && (
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isCompleted = completedStages.has(step.stage);
            const isCurrent = step.stage === currentStage;
            const isError = currentStage === 'error' && isCurrent;
            
            const StepIcon = step.icon || StageIcons[step.stage];
            
            return (
              <motion.div
                key={step.stage}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isCurrent ? 'bg-white/10' : ''
                }`}
              >
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  isCompleted 
                    ? 'bg-green-500 border-green-500' 
                    : isCurrent 
                    ? `border-current ${StageColors[step.stage]}` 
                    : 'border-white/20'
                }`}>
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Check size={16} className="text-white" />
                      </motion.div>
                    ) : isCurrent ? (
                      <motion.div
                        key="current"
                        animate={{ 
                          rotate: ['loading', 'processing'].includes(currentStage) ? 360 : 0 
                        }}
                        transition={{ 
                          duration: 1, 
                          repeat: ['loading', 'processing'].includes(currentStage) ? Infinity : 0, 
                          ease: 'linear' 
                        }}
                        className={StageColors[step.stage]}
                      >
                        <StepIcon size={16} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="pending"
                        className="text-white/30"
                      >
                        <StepIcon size={16} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="flex-1">
                  <div className={`font-medium text-sm ${
                    isCompleted 
                      ? 'text-green-400' 
                      : isCurrent 
                      ? 'text-white' 
                      : 'text-white/60'
                  }`}>
                    {step.title}
                  </div>
                  <div className={`text-xs mt-0.5 ${
                    isCurrent ? 'text-white/80' : 'text-white/40'
                  }`}>
                    {step.description}
                  </div>
                </div>

                {isError && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-red-400"
                  >
                    <AlertCircle size={16} />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 오류 처리 */}
      {error && onRetry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm transition-all"
            style={{ color: 'var(--text-primary)' }}
          >
            다시 시도
          </button>
        </motion.div>
      )}
    </div>
  );
}

// 프리셋 로딩 단계들
export const LoadingPresets = {
  dashboardLoad: [
    {
      stage: 'initializing' as LoadingStage,
      title: '초기화 중',
      description: '앱을 준비하고 있습니다',
      duration: 500
    },
    {
      stage: 'authenticating' as LoadingStage,
      title: '인증 확인',
      description: '사용자 권한을 확인합니다',
      duration: 800
    },
    {
      stage: 'loading' as LoadingStage,
      title: '데이터 로딩',
      description: '일정 정보를 가져오는 중',
      duration: 2000
    },
    {
      stage: 'finalizing' as LoadingStage,
      title: '마무리',
      description: '화면을 구성하는 중',
      duration: 300
    }
  ],

  eventSync: [
    {
      stage: 'loading' as LoadingStage,
      title: '동기화 중',
      description: 'Google 캘린더와 연결하는 중',
      duration: 1500
    },
    {
      stage: 'processing' as LoadingStage,
      title: '데이터 처리',
      description: '일정 정보를 업데이트하는 중',
      duration: 1000
    },
    {
      stage: 'finalizing' as LoadingStage,
      title: '완료',
      description: '동기화를 마무리하는 중',
      duration: 200
    }
  ],

  aiProcess: [
    {
      stage: 'processing' as LoadingStage,
      title: 'AI 처리',
      description: '메시지를 분석하고 있습니다',
      duration: 2000
    },
    {
      stage: 'finalizing' as LoadingStage,
      title: '응답 생성',
      description: '최적의 답변을 준비하는 중',
      duration: 800
    }
  ]
};

// 사용 편의를 위한 Hook
export function useProgressiveLoader(steps: LoadingStep[]) {
  const [currentStage, setCurrentStage] = useState<LoadingStage>(steps[0]?.stage || 'loading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();

  const nextStage = useCallback(() => {
    const currentIndex = steps.findIndex(s => s.stage === currentStage);
    if (currentIndex < steps.length - 1) {
      setCurrentStage(steps[currentIndex + 1].stage);
    } else {
      setCurrentStage('success');
      setProgress(100);
    }
  }, [currentStage, steps]);

  const setStage = useCallback((stage: LoadingStage) => {
    setCurrentStage(stage);
  }, []);

  const setErrorState = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setCurrentStage('error');
  }, []);

  const reset = useCallback(() => {
    setCurrentStage(steps[0]?.stage || 'loading');
    setProgress(0);
    setError(undefined);
  }, [steps]);

  return {
    currentStage,
    progress,
    error,
    nextStage,
    setStage,
    setProgress,
    setErrorState,
    reset
  };
}