# 사용자 컨텍스트 기반 Quick Actions 개선 시스템

## 1. 사용자 행동 패턴 분석 테이블

```sql
-- 사용자 행동 패턴 추적
CREATE TABLE user_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action_type VARCHAR(50), -- 'create_event', 'view_schedule', 'modify_event', 'search_events'
  context_data JSONB, -- 시간대, 이벤트 타입, 빈도 등
  frequency INTEGER DEFAULT 1,
  last_action_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 사용자 선호도 프로필
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  preferred_event_types TEXT[], -- ['meeting', 'personal', 'reminder']
  active_time_slots JSONB, -- 활동 시간대 선호도
  quick_action_history JSONB, -- 자주 사용하는 Quick Actions
  personalization_data JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 컨텍스트 템플릿
CREATE TABLE context_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100),
  condition_rules JSONB, -- 언제 이 템플릿을 사용할지
  suggested_actions JSONB, -- 제안할 액션들
  priority_weight INTEGER,
  locale VARCHAR(5),
  is_active BOOLEAN DEFAULT true
);
```

## 2. 컨텍스트 상황별 템플릿 예시

### A. 빈 일정 상황
```json
{
  "template_name": "empty_schedule_day",
  "condition_rules": {
    "events_today": 0,
    "time_of_day": ["morning", "afternoon"],
    "day_type": "weekday"
  },
  "suggested_actions": [
    {
      "text": "오늘 할 일 추가하기",
      "type": "create",
      "priority": 9,
      "action_data": {
        "event_type": "task",
        "default_duration": 60
      }
    },
    {
      "text": "다음 주 일정 미리 계획하기",
      "type": "create",
      "priority": 7
    }
  ]
}
```

### B. 바쁜 날 상황
```json
{
  "template_name": "busy_day_management",
  "condition_rules": {
    "events_today": ">= 5",
    "event_density": "high"
  },
  "suggested_actions": [
    {
      "text": "오늘 일정 요약 보기",
      "type": "analyze",
      "priority": 10
    },
    {
      "text": "급하지 않은 일정 내일로 이동",
      "type": "modify",
      "priority": 8
    }
  ]
}
```

### C. 특정 날짜 조회 후 상황
```json
{
  "template_name": "after_date_search",
  "condition_rules": {
    "last_action": "view_specific_date",
    "searched_date_events": "> 0"
  },
  "suggested_actions": [
    {
      "text": "{{searched_date}} 일정에 새 이벤트 추가",
      "type": "create",
      "priority": 9,
      "action_data": {
        "prefill_date": "{{searched_date}}"
      }
    },
    {
      "text": "{{searched_date}} 주변 날짜 일정 보기",
      "type": "view",
      "priority": 7
    }
  ]
}
```

## 3. 개인화 학습 시스템

### 사용자 패턴 분석 엔진
```typescript
interface UserPattern {
  commonEventTypes: string[];
  preferredTimeSlots: TimeSlot[];
  weeklyActivityPattern: WeekPattern;
  quickActionUsageFrequency: ActionFrequency[];
  seasonal_patterns?: SeasonalPattern;
}

interface SmartContext {
  currentTime: Date;
  userPatterns: UserPattern;
  recentActivity: RecentActivity[];
  calendarDensity: CalendarDensity;
  upcoming_important_events: CalendarEvent[];
  conversationContext: ConversationContext;
}
```

## 4. 머신러닝 기반 예측 시스템

### 사용자 의도 예측 모델
- **시간대별 행동 패턴 학습**
- **반복 이벤트 패턴 인식**
- **대화 맥락에서 다음 액션 예측**
- **계절/요일별 일정 패턴 분석**

### 추천 정확도 향상
- A/B 테스트를 통한 제안 효과 측정
- 사용자 피드백 수집 (제안 클릭률, 완성률)
- 실시간 학습 및 모델 업데이트

## 5. 구현 우선순위

### Phase 1: 기본 컨텍스트 시스템
1. ✅ 현재 시간/상황 기반 템플릿
2. ✅ 캘린더 데이터 분석 기능
3. ✅ 기본 규칙 엔진

### Phase 2: 개인화 시스템
1. 🔄 사용자 행동 패턴 수집
2. 🔄 개인별 템플릿 커스터마이징
3. 🔄 학습 기반 우선순위 조정

### Phase 3: 지능형 예측
1. ⏳ ML 모델 구축
2. ⏳ 실시간 컨텍스트 분석
3. ⏳ 예측적 제안 생성

## 6. 예상 효과

- **정확도 향상**: 현재 ~60% → 목표 ~85%
- **사용자 만족도**: 개인화된 제안으로 사용성 향상
- **효율성**: 사용자가 원하는 액션을 더 빠르게 찾기
- **학습 효과**: 시간이 지날수록 더 스마트한 제안