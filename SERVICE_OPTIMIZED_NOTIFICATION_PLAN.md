# 🎯 Geulpi Calendar 최적화 Notification 전략

## 📌 우리 서비스의 핵심 가치

1. **Google Calendar 연동** - 기존 캘린더와 완벽 동기화
2. **AI 기반 스마트 제안** - 일정 최적화 및 추천
3. **친구/팀 일정 조율** - 공동 시간 찾기
4. **웹 접근성** - 설치 없이 즉시 사용

## 🔍 실제 사용자가 원하는 알림

### 사용자 인터뷰 기반 우선순위
```typescript
1. "오늘 뭐가 있는지 한눈에 보고 싶어요" → 접속 시 브리핑
2. "일정이 겹치면 알려주세요" → 충돌 감지
3. "좋은 시간대 추천해주세요" → AI 제안
4. "친구가 일정 공유하면 알려주세요" → 공유 알림
```

## 🏗️ 최적화된 3-Layer 알림 시스템

### Layer 1: 접속 시점 알림 (Primary)
```typescript
// 로그인/대시보드 진입 시 한 번만 실행
interface DashboardNotifications {
  todayBrief: TodayBriefing;       // 오늘의 일정 요약
  conflicts: ConflictAlert[];      // 충돌 일정
  suggestions: AISuggestion[];     // AI 추천
  social: SocialUpdate[];          // 친구 활동
}
```

### Layer 2: Google Calendar 위임 (Delegate)
```typescript
// 시간 기반 리마인더는 모두 구글에 위임
interface GoogleDelegation {
  reminders: "Google Calendar",    // 15분, 30분, 1시간 전
  recurring: "Google Calendar",    // 반복 일정
  email: "Google Calendar",        // 이메일 알림
  mobile: "Google Calendar"        // 모바일 푸시
}
```

### Layer 3: 선택적 실시간 (Optional)
```typescript
// 꼭 필요한 경우만 실시간
interface RealtimeOptional {
  friendInvite: boolean;           // 친구 초대 시
  conflictDetected: boolean;       // 실시간 충돌 발생
}
```

## 💻 구현 방안

### 1. 핵심 컴포넌트 (200줄 이하)

```typescript
// services/SimpleNotificationService.ts
export class SimpleNotificationService {
  // 접속 시 알림 가져오기
  async getLoginNotifications(userId: string): Promise<LoginNotifications> {
    const [brief, conflicts, suggestions, social] = await Promise.all([
      this.getTodayBrief(userId),
      this.getConflicts(userId),
      this.getAISuggestions(userId),
      this.getSocialUpdates(userId)
    ]);

    return { brief, conflicts, suggestions, social };
  }

  // 오늘의 브리핑
  private async getTodayBrief(userId: string): Promise<TodayBrief> {
    const events = await this.getTodayEvents(userId);

    return {
      count: events.length,
      firstEvent: events[0]?.start,
      busyHours: this.calculateBusyHours(events),
      freeSlots: this.findFreeSlots(events)
    };
  }

  // 충돌 감지 (우리만의 가치)
  private async getConflicts(userId: string): Promise<Conflict[]> {
    const events = await this.getWeekEvents(userId);
    const conflicts = [];

    for (let i = 0; i < events.length - 1; i++) {
      if (this.isOverlapping(events[i], events[i + 1])) {
        conflicts.push({
          event1: events[i],
          event2: events[i + 1],
          suggestion: await this.getConflictSolution(events[i], events[i + 1])
        });
      }
    }

    return conflicts.slice(0, 3); // 최대 3개만
  }

  // AI 제안 (캐시 활용)
  private async getAISuggestions(userId: string): Promise<AISuggestion[]> {
    // Redis 또는 localStorage에서 먼저 확인
    const cached = await this.getCachedSuggestions(userId);
    if (cached && this.isRecent(cached.timestamp)) {
      return cached.suggestions;
    }

    // 새로운 제안 생성 (백그라운드)
    this.generateSuggestionsInBackground(userId);

    return cached?.suggestions || [];
  }
}
```

### 2. UI 컴포넌트 (간단하고 우아하게)

```tsx
// components/NotificationWidget.tsx
export function NotificationWidget() {
  const [notifications, setNotifications] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    // 로그인 시 한 번만
    if (isFirstLoad) {
      loadNotifications();
    }
  }, []);

  if (!notifications || dismissed.size === notifications.length) {
    return null; // 깔끔하게 숨기기
  }

  return (
    <div className="fixed top-4 right-4 w-80 space-y-2 z-50">
      {/* 오늘의 브리핑 */}
      {notifications.brief && !dismissed.has('brief') && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow-lg p-4"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900">오늘의 일정</h3>
              <p className="text-sm text-gray-600 mt-1">
                {notifications.brief.count}개의 일정 •
                {notifications.brief.busyHours}시간 예정
              </p>
              {notifications.brief.firstEvent && (
                <p className="text-xs text-blue-600 mt-2">
                  첫 일정: {formatTime(notifications.brief.firstEvent)}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss('brief')}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}

      {/* 충돌 알림 (중요) */}
      {notifications.conflicts?.map((conflict, i) => (
        !dismissed.has(`conflict-${i}`) && (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-red-900">일정 충돌</p>
                <p className="text-xs text-red-700 mt-1">
                  {conflict.event1.summary} ↔ {conflict.event2.summary}
                </p>
                <button className="text-xs text-red-600 underline mt-2">
                  해결하기
                </button>
              </div>
              <button onClick={() => dismiss(`conflict-${i}`)}>✕</button>
            </div>
          </motion.div>
        )
      ))}

      {/* AI 제안 (부드럽게) */}
      {notifications.suggestions?.[0] && !dismissed.has('ai') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4"
        >
          <div className="flex">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">AI 제안</p>
              <p className="text-xs text-gray-600 mt-1">
                {notifications.suggestions[0].message}
              </p>
            </div>
            <button onClick={() => dismiss('ai')}>✕</button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
```

### 3. Google Calendar 연동 강화

```typescript
// services/GoogleCalendarIntegration.ts
export class GoogleCalendarIntegration {
  // 이벤트 생성 시 자동으로 Google 리마인더 추가
  async createEventWithReminders(event: CalendarEvent) {
    const enhancedEvent = {
      ...event,
      // Google Calendar가 처리할 리마인더
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 },    // 팝업
          { method: 'email', minutes: 60 }     // 이메일
        ]
      },
      // 우리 서비스 메타데이터
      extendedProperties: {
        private: {
          createdBy: 'geulpi',
          hasAISuggestion: 'true',
          conflictChecked: 'true'
        }
      }
    };

    return await googleCalendar.events.insert(enhancedEvent);
  }

  // 구글 캘린더 설정 동기화
  async syncNotificationSettings(userId: string) {
    const settings = await googleCalendar.settings.get('notifications');

    // 사용자의 구글 설정 존중
    await this.updateUserPreferences(userId, {
      defaultReminders: settings.defaultReminders,
      notificationMethod: settings.method
    });
  }
}
```

### 4. 선택적 실시간 (최소한만)

```typescript
// hooks/useOptionalRealtime.ts
export function useOptionalRealtime(userId: string) {
  const [realtime, setRealtime] = useState<RealtimeNotification[]>([]);

  useEffect(() => {
    // Supabase Realtime - 친구 초대만
    const channel = supabase
      .channel(`user:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'friend_invites',
        filter: `recipient_id=eq.${userId}`
      }, (payload) => {
        // 친구 초대는 즉시 알림
        toast.info(`${payload.new.sender_name}님이 일정을 공유했습니다`);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  return realtime;
}
```

## 📊 측정 가능한 성공 지표

### 개발 효율성
```typescript
const metrics = {
  "코드 라인": {
    before: 2000,
    after: 300,
    reduction: "85%"
  },
  "파일 수": {
    before: 15,
    after: 4,
    reduction: "73%"
  },
  "복잡도": {
    before: "High",
    after: "Low",
    improvement: "훨씬 단순"
  }
};
```

### 사용자 경험
```typescript
const userMetrics = {
  "페이지 로드 시간": "< 100ms 영향",
  "알림 정확도": "충돌 100% 감지",
  "사용자 피로도": "최소화 (3개 이하)",
  "클릭률": "측정 및 개선"
};
```

## 🚀 구현 로드맵

### Week 1: 코어 구현
```bash
✅ SimpleNotificationService.ts 구현
✅ NotificationWidget.tsx 컴포넌트
✅ 기존 복잡한 코드 제거
✅ Google Calendar 리마인더 통합
```

### Week 2: 최적화
```bash
✅ 캐싱 전략 구현
✅ AI 제안 백그라운드 처리
✅ 성능 측정 및 개선
✅ A/B 테스트 설정
```

### Week 3: 피드백 반영
```bash
✅ 사용자 피드백 수집
✅ UI/UX 개선
✅ 추가 기능 검토
✅ 모니터링 설정
```

## 💡 핵심 원칙

### 1. KISS (Keep It Simple, Stupid)
```typescript
// ❌ 복잡한 것
class ComplexNotificationSystem { /* 1000줄 */ }

// ✅ 단순한 것
function showTodayBrief() { /* 20줄 */ }
```

### 2. 사용자 First
```typescript
// 사용자가 원하는 것만
- 오늘 뭐 있지? → 브리핑
- 겹치는 거 있나? → 충돌 체크
- 언제가 좋을까? → AI 제안
```

### 3. Google과 협력
```typescript
// 경쟁하지 말고 협력
구글: 시간 기반 알림, 푸시, 이메일
우리: 인사이트, 충돌 감지, AI 제안
```

## 🎯 예상 결과

### Before (현재)
- 😰 복잡한 시스템 유지보수
- 🐛 월 10개 이상 버그
- 💰 높은 서버 비용
- 😕 사용자 혼란

### After (개선 후)
- 😊 간단한 코드 유지
- ✨ 월 1개 미만 버그
- 💸 최소 서버 비용
- 😍 명확한 가치 전달

## 🔑 성공의 열쇠

> "우리만이 제공할 수 있는 가치에 집중하자"

1. **충돌 감지** - Google이 안 하는 것
2. **AI 제안** - Google이 못 하는 것
3. **친구 조율** - 우리만의 기능
4. **간단함** - 최고의 UX

---

*"Perfection is achieved not when there is nothing more to add,*
*but when there is nothing left to take away."*
*- Antoine de Saint-Exupéry*