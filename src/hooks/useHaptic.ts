'use client';

import { useCallback, useRef } from 'react';

// 햅틱 피드백 스타일 정의
export type HapticStyle = 
  | 'light'      // 가벼운 탭
  | 'medium'     // 중간 탭
  | 'heavy'      // 강한 탭
  | 'success'    // 성공 피드백
  | 'warning'    // 경고 피드백
  | 'error'      // 오류 피드백
  | 'selection'  // 선택 피드백
  | 'impact';    // 충격 피드백

// 햅틱 패턴 정의
const hapticPatterns: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 20, 10],
  warning: [20, 10, 20],
  error: [30, 20, 30],
  selection: 5,
  impact: [50]
};

// iOS 스타일 햅틱 엔진 인터페이스
interface HapticEngine {
  impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
  notificationOccurred: (type: 'success' | 'warning' | 'error') => void;
  selectionChanged: () => void;
}

// 햅틱 피드백 훅
export function useHaptic() {
  const isSupported = useRef(typeof window !== 'undefined' && 'vibrate' in navigator);
  const lastTriggerTime = useRef(0);
  const minInterval = 50; // 최소 간격 (ms)

  // iOS 스타일 햅틱 엔진 시뮬레이션
  const hapticEngine = useRef<HapticEngine>({
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => {
      if (!isSupported.current) return;
      
      const pattern = hapticPatterns[style];
      navigator.vibrate(pattern);
    },
    notificationOccurred: (type: 'success' | 'warning' | 'error') => {
      if (!isSupported.current) return;
      
      const pattern = hapticPatterns[type];
      navigator.vibrate(pattern);
    },
    selectionChanged: () => {
      if (!isSupported.current) return;
      
      navigator.vibrate(hapticPatterns.selection);
    }
  });

  // 햅틱 트리거 함수
  const trigger = useCallback((style: HapticStyle = 'light') => {
    if (!isSupported.current) return;

    // 너무 빈번한 트리거 방지
    const now = Date.now();
    if (now - lastTriggerTime.current < minInterval) return;
    lastTriggerTime.current = now;

    try {
      // 스타일에 따른 햅틱 실행
      switch (style) {
        case 'light':
        case 'medium':
        case 'heavy':
          hapticEngine.current.impactOccurred(style);
          break;
        case 'success':
        case 'warning':
        case 'error':
          hapticEngine.current.notificationOccurred(style);
          break;
        case 'selection':
          hapticEngine.current.selectionChanged();
          break;
        case 'impact':
          navigator.vibrate(hapticPatterns.impact);
          break;
        default:
          navigator.vibrate(hapticPatterns.light);
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, []);

  // 패턴 기반 햅틱 실행
  const triggerPattern = useCallback((pattern: number | number[]) => {
    if (!isSupported.current) return;

    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Haptic pattern failed:', error);
    }
  }, []);

  // 연속 햅틱 (진동)
  const startContinuous = useCallback((duration: number = 1000) => {
    if (!isSupported.current) return;

    const pattern: number[] = [];
    const vibrateDuration = 50;
    const pauseDuration = 50;
    const cycles = Math.floor(duration / (vibrateDuration + pauseDuration));

    for (let i = 0; i < cycles; i++) {
      pattern.push(vibrateDuration, pauseDuration);
    }

    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Continuous haptic failed:', error);
    }
  }, []);

  // 햅틱 중지
  const stop = useCallback(() => {
    if (!isSupported.current) return;

    try {
      navigator.vibrate(0);
    } catch (error) {
      console.warn('Stop haptic failed:', error);
    }
  }, []);

  // 햅틱 시퀀스 실행
  const playSequence = useCallback(async (sequence: Array<{ style: HapticStyle; delay: number }>) => {
    if (!isSupported.current) return;

    for (const step of sequence) {
      trigger(step.style);
      await new Promise(resolve => setTimeout(resolve, step.delay));
    }
  }, [trigger]);

  return {
    isSupported: isSupported.current,
    trigger,
    triggerPattern,
    startContinuous,
    stop,
    playSequence
  };
}

// 햅틱 피드백 유틸리티 함수들
export const HapticUtils = {
  // 성공 시퀀스
  success: () => {
    const { trigger } = useHaptic();
    trigger('success');
  },

  // 오류 시퀀스
  error: () => {
    const { trigger } = useHaptic();
    trigger('error');
  },

  // 경고 시퀀스
  warning: () => {
    const { trigger } = useHaptic();
    trigger('warning');
  },

  // 선택 피드백
  selection: () => {
    const { trigger } = useHaptic();
    trigger('selection');
  },

  // 임팩트 피드백
  impact: (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    const { trigger } = useHaptic();
    trigger(style);
  }
};

// 컨텍스트별 햅틱 피드백
export const contextualHaptic = {
  // 버튼 탭
  buttonTap: () => {
    const { trigger } = useHaptic();
    trigger('light');
  },

  // 토글 스위치
  toggleSwitch: () => {
    const { trigger } = useHaptic();
    trigger('selection');
  },

  // 슬라이더 이동
  sliderChange: () => {
    const { trigger } = useHaptic();
    trigger('selection');
  },

  // 스와이프 액션
  swipeAction: () => {
    const { trigger } = useHaptic();
    trigger('medium');
  },

  // 풀 투 리프레시
  pullToRefresh: () => {
    const { trigger } = useHaptic();
    trigger('medium');
  },

  // 페이지 전환
  pageTransition: () => {
    const { trigger } = useHaptic();
    trigger('light');
  },

  // 메뉴 열기/닫기
  menuToggle: () => {
    const { trigger } = useHaptic();
    trigger('light');
  },

  // 캘린더 날짜 선택
  dateSelect: () => {
    const { trigger } = useHaptic();
    trigger('selection');
  },

  // 이벤트 생성
  eventCreate: () => {
    const { trigger } = useHaptic();
    trigger('success');
  },

  // 이벤트 삭제
  eventDelete: () => {
    const { trigger } = useHaptic();
    trigger('warning');
  },

  // 알림
  notification: () => {
    const { trigger } = useHaptic();
    trigger('medium');
  },

  // 로딩 완료
  loadComplete: () => {
    const { trigger } = useHaptic();
    trigger('light');
  }
};