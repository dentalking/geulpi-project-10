# 📊 UX 명확성 개선 계획

## 🔍 현재 혼란 포인트

### 사용자 관점에서의 문제
1. **시각적 불일치**
   - 캘린더에 50개 이벤트가 보임
   - AI는 "일정이 없다"고 응답
   - 사용자: "뭐가 맞는 거지?"

2. **컨텍스트 부족**
   - 어떤 날짜 기준인지 불명확
   - 전체 vs 오늘 구분 없음
   - 시간 범위 표시 없음

3. **피드백 불충분**
   - 현재 보고 있는 것이 무엇인지 불명확
   - 필터링 상태 표시 없음

## 🎯 개선 방안

### 1. 날짜 컨텍스트 배지 추가

```typescript
// components/CalendarStatusBadge.tsx
interface CalendarStatusBadgeProps {
  totalEvents: number;
  todayEvents: number;
  currentMonth: string;
  selectedDate: Date;
}

export function CalendarStatusBadge({
  totalEvents,
  todayEvents,
  currentMonth,
  selectedDate
}: CalendarStatusBadgeProps) {
  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className="absolute top-4 left-4 z-50 flex gap-2">
      {/* 월 전체 통계 */}
      <div className="bg-white/90 dark:bg-black/90 backdrop-blur-xl
                      rounded-full px-3 py-1.5 flex items-center gap-2
                      shadow-lg border border-white/20">
        <Calendar className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">
          {currentMonth}: {totalEvents}개 일정
        </span>
      </div>

      {/* 오늘 하이라이트 */}
      {isToday && (
        <div className="bg-primary/10 backdrop-blur-xl
                        rounded-full px-3 py-1.5 flex items-center gap-2
                        shadow-lg border-2 border-primary/50 animate-pulse-slow">
          <Star className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">
            오늘: {todayEvents}개
          </span>
        </div>
      )}
    </div>
  );
}
```

### 2. AI 응답 컨텍스트 강화

```typescript
// services/ai/ChatCalendarService.ts
private formatContextualResponse(
  events: CalendarEvent[],
  timezone: string,
  locale: string
) {
  const today = new Date();
  const todayEvents = events.filter(e => isSameDay(e.start_time, today));
  const thisWeekEvents = events.filter(e => isThisWeek(e.start_time));
  const thisMonthEvents = events.filter(e => isThisMonth(e.start_time));

  // 더 명확한 응답 생성
  if (todayEvents.length === 0) {
    let response = locale === 'ko'
      ? `오늘(${format(today, 'M월 d일')})은 일정이 없습니다.`
      : `No events today (${format(today, 'MMM d')}).`;

    // 컨텍스트 추가
    if (thisWeekEvents.length > 0) {
      response += locale === 'ko'
        ? `\n\n📅 이번 주에는 ${thisWeekEvents.length}개의 일정이 있습니다.`
        : `\n\n📅 You have ${thisWeekEvents.length} events this week.`;
    }

    if (thisMonthEvents.length > todayEvents.length) {
      const upcomingCount = thisMonthEvents.length - todayEvents.length;
      response += locale === 'ko'
        ? `\n📊 이번 달 남은 일정: ${upcomingCount}개`
        : `\n📊 Remaining this month: ${upcomingCount} events`;
    }

    return response;
  }

  // 일정이 있을 때도 컨텍스트 포함
  return locale === 'ko'
    ? `오늘 ${todayEvents.length}개의 일정이 있습니다. (전체 ${events.length}개 중)`
    : `You have ${todayEvents.length} events today. (${events.length} total)`;
}
```

### 3. 오늘 날짜 시각적 강조

```typescript
// components/MobileCalendarView.tsx
// 오늘 날짜 셀 스타일 개선
const getDayCellClassName = (date: Date, isToday: boolean) => {
  let className = "calendar-day-cell";

  if (isToday) {
    className += " today-highlight";
    // 오늘 날짜 강조 스타일
    className += " ring-2 ring-primary ring-offset-2";
    className += " bg-primary/5";
    className += " font-bold";
    className += " relative";
  }

  return className;
};

// 오늘 마커 추가
{isToday && (
  <div className="absolute -top-1 -right-1">
    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
    <span className="sr-only">오늘</span>
  </div>
)}
```

### 4. 실시간 이벤트 카운터 위젯

```typescript
// components/EventCounterWidget.tsx
export function EventCounterWidget({ events }: { events: CalendarEvent[] }) {
  const stats = useMemo(() => {
    const now = new Date();
    return {
      today: events.filter(e => isSameDay(e.start_time, now)).length,
      thisWeek: events.filter(e => isThisWeek(e.start_time)).length,
      thisMonth: events.filter(e => isThisMonth(e.start_time)).length,
      total: events.length
    };
  }, [events]);

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl
                      rounded-2xl shadow-2xl border border-white/20 p-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>오늘: {stats.today}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span>주간: {stats.thisWeek}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            <span>월간: {stats.thisMonth}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-500 rounded-full" />
            <span>전체: {stats.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5. 필터 상태 표시

```typescript
// components/FilterStatusBar.tsx
export function FilterStatusBar({
  activeFilter,
  onFilterChange
}: FilterStatusBarProps) {
  const filters = [
    { id: 'today', label: '오늘', icon: Sun },
    { id: 'week', label: '이번 주', icon: Calendar },
    { id: 'month', label: '이번 달', icon: CalendarDays },
    { id: 'all', label: '전체', icon: Layers }
  ];

  return (
    <div className="absolute top-4 right-4 z-50">
      <div className="flex gap-1 bg-white/80 dark:bg-black/80
                      backdrop-blur-xl rounded-full p-1">
        {filters.map(filter => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium
              transition-all duration-200 flex items-center gap-1
              ${activeFilter === filter.id
                ? 'bg-primary text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
            `}
          >
            <filter.icon className="w-3 h-3" />
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 6. 로딩/동기화 상태 표시

```typescript
// components/SyncStatusIndicator.tsx
export function SyncStatusIndicator({ isSyncing, lastSync }: SyncStatusProps) {
  return (
    <div className="absolute bottom-4 left-4 z-50">
      <div className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full
        bg-white/90 dark:bg-black/90 backdrop-blur-xl
        shadow-lg border border-white/20
        transition-opacity duration-200
        ${isSyncing ? 'opacity-100' : 'opacity-60'}
      `}>
        {isSyncing ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs">동기화 중...</span>
          </>
        ) : (
          <>
            <Check className="w-3 h-3 text-green-500" />
            <span className="text-xs">
              마지막 업데이트: {formatRelativeTime(lastSync)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
```

## 🎨 CSS 개선

```css
/* styles/calendar-clarity.css */

/* 오늘 날짜 강조 */
.today-highlight {
  position: relative;
  background: linear-gradient(135deg,
    var(--primary-50) 0%,
    var(--primary-100) 100%);
  animation: today-pulse 2s ease-in-out infinite;
}

@keyframes today-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 var(--primary-400);
  }
  50% {
    box-shadow: 0 0 0 8px transparent;
  }
}

/* 이벤트 수 표시 */
.event-count-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 20px;
  height: 20px;
  padding: 2px 6px;
  background: var(--primary);
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 비어있는 날 표시 */
.empty-day {
  opacity: 0.5;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    var(--gray-50) 10px,
    var(--gray-50) 20px
  );
}
```

## 📋 구현 우선순위

### Phase 1 (즉시 구현)
1. ✅ CalendarStatusBadge - 현재 상태 명확히 표시
2. ✅ AI 응답 컨텍스트 추가 - 전체 vs 오늘 구분
3. ✅ 오늘 날짜 하이라이트 강화

### Phase 2 (1일 내)
4. 📊 EventCounterWidget - 실시간 통계
5. 🔍 FilterStatusBar - 필터 상태 시각화

### Phase 3 (선택적)
6. 🔄 SyncStatusIndicator - 동기화 상태
7. 🎨 전체적인 시각적 일관성 개선

## 🎯 예상 효과

### Before
- 사용자: "50개가 보이는데 왜 없다고 하지?"
- 혼란도: 8/10

### After
- 사용자: "아, 월 전체는 50개, 오늘은 0개구나!"
- 명확도: 9/10

## 💡 핵심 원칙

1. **Always Show Context**: 항상 컨텍스트를 표시
2. **Visual Hierarchy**: 중요도에 따른 시각적 계층
3. **Consistent Feedback**: 일관된 피드백 제공
4. **Progressive Disclosure**: 점진적 정보 공개

---

**구현 난이도**: ⭐⭐☆☆☆ (쉬움)
**예상 소요 시간**: 2-3시간
**효과**: ⭐⭐⭐⭐⭐ (매우 높음)