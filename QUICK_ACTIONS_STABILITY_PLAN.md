# Quick Actions (빠른 작업) 기능 안정화 계획

## 현재 분석된 문제점

### 1. 과도한 복잡도
- **3단계 레이어 구조**: EnhancedSuggestionService → IntelligentSuggestionService → Fallback
- 각 서비스마다 다른 로직과 데이터 구조 사용
- 에러 시 연쇄 fallback으로 인한 지연과 불안정성

### 2. 캐싱 전략 문제
- 캐시 키가 너무 복잡: `${locale}-${sessionId}-${userId}-${messageContext}-${selectedDate}-${selectedEvent}-${!!lastAIResponse}`
- 캐시가 거의 작동하지 않음 (키가 매번 변경됨)
- 메모리 기반 캐싱으로 서버 재시작 시 초기화

### 3. API 호출 최적화 부재
- 3초마다 자동 갱신 (너무 잦은 빈도)
- follow-up 제안은 100ms 지연 (너무 빠름)
- Rate limiting 처리가 있지만 실제로는 너무 많은 요청 발생

### 4. 데이터 일관성 문제
- Google Calendar와 로컬 이벤트 동기화 불일치
- 서로 다른 형식의 제안 데이터 (`suggestions`, `smartSuggestions`, `enhancedSuggestions`)
- 프론트엔드에서 어떤 데이터를 사용할지 혼란

## 개선 방안

### 1. 심플하고 안정적인 단일 서비스 구조
```typescript
// SimpleSuggestionService로 통합
class SimpleSuggestionService {
  - 컨텍스트 기반 제안
  - 시간대별 기본 제안
  - 간단한 이벤트 기반 제안
  - 빠른 응답 시간 보장
}
```

### 2. 효율적인 캐싱 전략
```typescript
// 간단한 캐시 키
const cacheKey = `${locale}-${timeOfDay}-${hasEvents}`;

// Redis 또는 영구 저장소 사용 고려
// 캐시 유효 시간 15분으로 증가
```

### 3. API 호출 최적화
```typescript
// 제안 갱신 주기
- 초기 로드: 즉시
- 일반 갱신: 30초
- Follow-up: 2초
- 유휴 상태: 5분
```

### 4. 프론트엔드 통합 개선
```typescript
// 단일 데이터 구조
{
  suggestions: string[],  // 표시할 텍스트
  metadata: {            // 추가 정보
    type: string,
    priority: number
  }[]
}
```

## 구현 단계

### Phase 1: 백엔드 심플화 (현재 작업)
1. ✅ 현재 구조 분석 완료
2. 🔄 SimpleSuggestionService 구현
3. ⏳ API route 최적화
4. ⏳ 캐싱 개선

### Phase 2: 프론트엔드 안정화
1. ⏳ 제안 표시 로직 단순화
2. ⏳ 디바운싱 및 스로틀링 적용
3. ⏳ 에러 처리 개선

### Phase 3: 테스트 및 모니터링
1. ⏳ E2E 테스트 작성
2. ⏳ 성능 메트릭 추가
3. ⏳ 사용자 피드백 수집

## 즉시 적용 가능한 Quick Fixes

1. **API 호출 빈도 조정**: 3초 → 30초
2. **캐시 유효시간 증가**: 5분 → 15분
3. **Fallback 단순화**: 3단계 → 1단계
4. **불필요한 로깅 제거**: 프로덕션 환경 최적화

## 예상 결과

- **응답 시간**: 평균 2-3초 → 100ms 이하
- **API 호출 감소**: 분당 20회 → 분당 2-3회
- **에러율 감소**: 10% → 1% 미만
- **사용자 경험 개선**: 일관되고 빠른 제안 제공