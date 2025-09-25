# Quick Actions 품질 피드백

## 현재 표시된 Quick Actions
1. ❓ "Check remaining tasks today"
2. ❌ "Edit event details"
3. ❌ "Add similar event"
4. ✅ "Add evening event"

## 컨텍스트 분석

### 사용자 시나리오
```
사용자: "Show today's schedule"
AI: "오늘(9월 23일) 일정 없음"
Quick Actions: 위 4개 제안
```

## 품질 평가: 3/10 ⚠️

### 문제점

#### 1. 컨텍스트 불일치 (치명적)
- **"Edit event details"**
  - 문제: 편집할 일정이 없음
  - 기대: 일정이 있을 때만 표시

- **"Add similar event"**
  - 문제: 참조할 이벤트가 없음
  - 기대: 기존 이벤트가 있을 때만 표시

#### 2. 중복 정보 제공
- **"Check remaining tasks today"**
  - 문제: 방금 오늘 일정 없다고 확인함
  - 기대: 다른 유용한 제안

#### 3. Follow-up 로직 오류
- AI 응답: "일정 없음"
- SimpleSuggestionService: 일반적인 이벤트 관련 제안 반환
- **근본 원인**: lastAIResponse 컨텍스트 분석 부족

## 기대했던 제안

### 일정이 없을 때 적절한 Quick Actions:
```
1. ✅ "Add morning meeting"
2. ✅ "Schedule lunch appointment"
3. ✅ "Add evening event"
4. ✅ "Import events from photo"
5. ✅ "Create recurring event"
```

## 코드 분석

### SimpleSuggestionService의 문제
```typescript
// getFollowUpSuggestions 메서드
if (lowerMessage.includes('event') || lowerMessage.includes('schedule')) {
  suggestions.push(
    { text: "Edit event details", priority: 8, category: 'action' },
    { text: "Add similar event", priority: 7, category: 'create' }
  );
}
```

**문제**: 단순 키워드 매칭만으로 제안 생성
**필요**: AI 응답의 의미론적 분석

## 개선 방안

### 1. 즉시 적용 가능 (Quick Fix)
```typescript
// AI 응답 분석 강화
if (lastMessage.includes('no events') || lastMessage.includes('없음')) {
  // 일정이 없을 때 제안
  return [
    { text: "Add morning appointment", priority: 9 },
    { text: "Schedule afternoon meeting", priority: 8 },
    { text: "Create recurring event", priority: 7 },
    { text: "Import from calendar photo", priority: 6 }
  ];
}
```

### 2. 컨텍스트 기반 개선
```typescript
// 이벤트 수에 따른 제안 분화
if (events.length === 0) {
  // 일정 없음 → 생성 제안
  suggestions = getEmptyScheduleSuggestions();
} else if (events.length < 3) {
  // 일정 적음 → 추가 제안
  suggestions = getLightScheduleSuggestions();
} else {
  // 일정 많음 → 관리 제안
  suggestions = getBusyScheduleSuggestions();
}
```

### 3. 시간대별 최적화
```typescript
const hour = new Date().getHours();
if (events.length === 0) {
  if (hour < 12) {
    // 오전 + 일정 없음
    suggestions.push("Add lunch meeting");
    suggestions.push("Schedule afternoon tasks");
  } else if (hour < 18) {
    // 오후 + 일정 없음
    suggestions.push("Add evening workout");
    suggestions.push("Schedule tomorrow's meetings");
  }
}
```

## 권장 우선순위

### P0 (긴급)
- ❌ 부적절한 제안 제거 로직 추가
- ✅ 일정 없음 컨텍스트 인식

### P1 (중요)
- 📊 이벤트 수 기반 제안 분화
- 🕐 시간대별 제안 정교화

### P2 (권장)
- 🧠 AI 응답 의미 분석
- 📈 사용자 패턴 학습

## 결론

현재 Quick Actions는 **컨텍스트 인식 실패**로 인해 품질이 낮습니다.

SimpleSuggestionService는 빠르지만, AI 응답의 의미를 제대로 파악하지 못하고 있습니다.

**핵심 개선점**:
"일정 없음" 상황을 인식하고 적절한 "생성" 위주 제안을 제공해야 합니다.