/**
 * Feature Flag Configuration
 * 새로운 기능을 안전하게 점진적으로 롤아웃하기 위한 설정
 */

export const FEATURES = {
  // Quick Actions 사용자 행동 추적
  QUICK_ACTION_TRACKING: process.env.NEXT_PUBLIC_ENABLE_TRACKING === 'true',

  // 개인화된 Quick Actions 제안
  PERSONALIZED_SUGGESTIONS: process.env.NEXT_PUBLIC_ENABLE_PERSONALIZATION === 'true',

  // 디버그 로깅 활성화
  DEBUG_QUICK_ACTIONS: process.env.NEXT_PUBLIC_DEBUG_QUICK_ACTIONS === 'true'
} as const;

// 사용자별 A/B 테스트 그룹 할당
export function getExperimentGroup(userId: string | null): 'control' | 'personalized' {
  if (!userId) return 'control';

  // 간단한 해시 기반 그룹 할당 (50/50 분할)
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % 2 === 0 ? 'control' : 'personalized';
}

// Feature availability check
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature] || false;
}

// 개발 환경에서 feature 상태 로깅
if (process.env.NODE_ENV === 'development') {
  console.log('[Features] Configuration:', {
    tracking: FEATURES.QUICK_ACTION_TRACKING,
    personalization: FEATURES.PERSONALIZED_SUGGESTIONS,
    debug: FEATURES.DEBUG_QUICK_ACTIONS
  });
}