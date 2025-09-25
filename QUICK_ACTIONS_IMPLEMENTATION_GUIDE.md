# 📋 Quick Actions 개인화 구현 가이드

## 🎯 구현 완료 사항

### 1. 데이터베이스 스키마
✅ **파일**: `/supabase/migrations/20250923_create_user_action_logs.sql`
- 사용자 행동 추적 테이블 생성
- RLS (Row Level Security) 정책 설정
- 집계 뷰 및 분석 함수 포함

### 2. 백엔드 API
✅ **파일**: `/src/app/api/analytics/quick-action/route.ts`
- 개별 로그 전송 (POST)
- 배치 로그 전송 (PUT)
- 사용자 선호도 자동 분석

### 3. 프론트엔드 추적
✅ **파일**: `/src/hooks/useQuickActionTracking.ts`
- 클릭, 표시, 무시 이벤트 추적
- 배치 모드 지원
- 응답 시간 측정

### 4. 개인화 서비스
✅ **파일**: `/src/services/ai/PersonalizedSuggestionService.ts`
- 사용자 선호도 기반 점수 계산
- 다양성 보장 알고리즘
- 캐싱 전략 구현

## 🚀 안전한 도입 방법

### Step 1: 데이터베이스 마이그레이션 (필수)

```bash
# Supabase CLI 사용
supabase migration up

# 또는 Supabase 대시보드에서 직접 실행
# SQL Editor > New Query > 파일 내용 복사 후 실행
```

**확인 사항**:
- `user_action_logs` 테이블 생성 확인
- RLS 정책 활성화 확인
- `get_user_preferences` 함수 생성 확인

### Step 2: Feature Flag로 점진적 활성화

```typescript
// /src/config/features.ts (새로 생성)
export const FEATURES = {
  QUICK_ACTION_TRACKING: process.env.NEXT_PUBLIC_ENABLE_TRACKING === 'true',
  PERSONALIZED_SUGGESTIONS: process.env.NEXT_PUBLIC_ENABLE_PERSONALIZATION === 'true'
};
```

```bash
# .env.local
NEXT_PUBLIC_ENABLE_TRACKING=false  # 처음에는 false로 시작
NEXT_PUBLIC_ENABLE_PERSONALIZATION=false
```

### Step 3: AIOverlayDashboard 컴포넌트 수정

```typescript
// /src/components/AIOverlayDashboard.tsx

import { useQuickActionTracking } from '@/hooks/useQuickActionTracking';
import { FEATURES } from '@/config/features';

// 컴포넌트 내부
const { trackClick, trackDisplay } = useQuickActionTracking({
  batchMode: true,
  trackDisplay: FEATURES.QUICK_ACTION_TRACKING
});

// Quick Actions 렌더링 부분
useEffect(() => {
  if (FEATURES.QUICK_ACTION_TRACKING && suggestions.length > 0) {
    trackDisplay(suggestions.map(s => ({
      text: s,
      category: detectCategory(s)
    })));
  }
}, [suggestions]);

// 클릭 핸들러
const handleQuickActionClick = (suggestion: string) => {
  if (FEATURES.QUICK_ACTION_TRACKING) {
    trackClick(suggestion, detectCategory(suggestion), position);
  }
  // 기존 로직...
};
```

### Step 4: 제안 서비스 교체 (선택적)

```typescript
// /src/app/api/ai/suggestions/route.ts

import { PersonalizedSuggestionService } from '@/services/ai/PersonalizedSuggestionService';
import { SimpleSuggestionService } from '@/services/ai/SimpleSuggestionService';
import { FEATURES } from '@/config/features';

// 서비스 선택
const suggestionService = FEATURES.PERSONALIZED_SUGGESTIONS && userId
  ? new PersonalizedSuggestionService(locale as 'ko' | 'en', userId)
  : new SimpleSuggestionService(locale as 'ko' | 'en');

// 제안 생성
const suggestions = FEATURES.PERSONALIZED_SUGGESTIONS && userId
  ? await suggestionService.generatePersonalizedSuggestions(context)
  : suggestionService.generateSuggestions(context);
```

## 📊 모니터링 및 검증

### 1. 기본 메트릭 확인 (Supabase SQL Editor)

```sql
-- 최근 24시간 Quick Action 클릭률
SELECT
  suggestion_text,
  COUNT(*) FILTER (WHERE action_type = 'clicked') as clicks,
  COUNT(*) FILTER (WHERE action_type = 'displayed') as displays,
  ROUND(
    COUNT(*) FILTER (WHERE action_type = 'clicked')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE action_type = 'displayed'), 0) * 100,
    2
  ) as ctr_percentage
FROM user_action_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY suggestion_text
ORDER BY clicks DESC;

-- 시간대별 활동 패턴
SELECT
  time_of_day,
  COUNT(*) as total_actions,
  COUNT(DISTINCT user_id) as unique_users
FROM user_action_logs
WHERE action_type = 'clicked'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY time_of_day
ORDER BY total_actions DESC;

-- 평균 응답 시간
SELECT
  AVG(response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time
FROM user_action_logs
WHERE action_type = 'clicked'
  AND response_time_ms IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours';
```

### 2. A/B 테스트 설정

```typescript
// /src/utils/abTesting.ts
export function getExperimentGroup(userId: string): 'control' | 'personalized' {
  // 간단한 해시 기반 그룹 할당
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % 2 === 0 ? 'control' : 'personalized';
}

// 사용
const group = userId ? getExperimentGroup(userId) : 'control';
const usePersonalization = group === 'personalized';
```

## ⚠️ 주의 사항

### 1. 프라이버시 고려
- 민감한 정보는 로깅하지 않기
- GDPR/개인정보보호법 준수
- 사용자 동의 받기 (선택적)

### 2. 성능 영향 최소화
- 배치 모드 사용 권장
- 5초 간격으로 배치 전송
- 페이지 언로드 시 `sendBeacon` 사용

### 3. 데이터 보관 정책
```sql
-- 90일 이상 된 로그 자동 삭제 (Cron Job)
DELETE FROM user_action_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

## 🔄 단계별 롤아웃 계획

### Phase 1: 관찰 모드 (1주)
```bash
NEXT_PUBLIC_ENABLE_TRACKING=true
NEXT_PUBLIC_ENABLE_PERSONALIZATION=false
```
- 데이터 수집만 진행
- 사용자 경험 변화 없음
- 메트릭 베이스라인 설정

### Phase 2: 10% 실험 (1주)
```typescript
const enablePersonalization = Math.random() < 0.1; // 10% 사용자만
```
- 소규모 사용자 그룹 테스트
- CTR 개선 확인
- 버그 및 이슈 모니터링

### Phase 3: 50/50 A/B 테스트 (2주)
```typescript
const enablePersonalization = getExperimentGroup(userId) === 'personalized';
```
- 통계적 유의성 확보
- 성과 지표 비교
- 사용자 피드백 수집

### Phase 4: 전체 롤아웃 (성과 확인 후)
```bash
NEXT_PUBLIC_ENABLE_TRACKING=true
NEXT_PUBLIC_ENABLE_PERSONALIZATION=true
```
- 모든 사용자에게 적용
- 지속적 최적화

## 📈 성공 지표

### 즉시 측정 가능 (1일)
- ✅ 로그 데이터 수집 확인
- ✅ API 응답 시간 < 200ms
- ✅ 에러율 < 1%

### 단기 지표 (1주)
- 📊 CTR 베이스라인 설정
- 📊 평균 응답 시간 측정
- 📊 가장 인기 있는 제안 파악

### 중기 지표 (2-4주)
- 🎯 CTR 15% 개선 (personalized vs control)
- 🎯 사용자 재방문율 10% 증가
- 🎯 Quick Action 사용률 20% 증가

### 장기 지표 (1개월+)
- 🚀 월간 활성 사용자 15% 증가
- 🚀 이벤트 생성률 25% 증가
- 🚀 사용자 만족도 4.2/5.0

## 🔧 트러블슈팅

### 문제: 로그가 저장되지 않음
```sql
-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'user_action_logs';

-- 수동 테스트
SELECT insert_test_action_log(
  'test-user-id'::uuid,
  'Test suggestion',
  'clicked'
);
```

### 문제: 개인화가 작동하지 않음
```typescript
// 콘솔에서 확인
console.log('User preferences:', global.userPreferences?.[userId]);
console.log('Feature flags:', FEATURES);
```

### 문제: 성능 저하
- 배치 간격 늘리기 (5초 → 10초)
- 캐시 TTL 늘리기 (5분 → 15분)
- 로그 전송을 Web Worker로 이동

## 📝 체크리스트

### 배포 전
- [ ] 데이터베이스 마이그레이션 실행
- [ ] Feature flags 설정
- [ ] 에러 모니터링 설정 (Sentry)
- [ ] 성능 모니터링 설정

### 배포 후
- [ ] 로그 데이터 수집 확인
- [ ] API 응답 시간 모니터링
- [ ] 에러율 모니터링
- [ ] 첫 24시간 메트릭 검토

### 1주 후
- [ ] CTR 베이스라인 분석
- [ ] 사용자 패턴 분석
- [ ] A/B 테스트 시작 여부 결정

---

**상태**: 구현 완료 ✅ | 테스트 대기 🔄