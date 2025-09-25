# 🔍 One Line 모드 통합 분석

## 현재 통합 상태: **부분적 통합** ⚠️

One Line 모드는 기본적인 데이터 공유는 되지만, 완전히 유기적으로 연결되지는 않았습니다.

## ✅ 잘 연결된 부분

### 1. **EventContext 통합**
```typescript
// One Line 페이지에서 EventContext 사용 중
const { events, setEvents, selectEvent } = useEvents();
```
- 모든 페이지가 동일한 EventProvider 하위에 있음
- 이벤트 데이터가 모든 뷰에서 공유됨
- Classic ↔ One Line 전환 시 데이터 유지

### 2. **Provider 계층 구조**
```typescript
// app/layout.tsx
<ThemeProvider>
  <ToastProvider>
    <EventProvider>
      {children}  // 모든 페이지가 이 안에 포함
    </EventProvider>
  </ToastProvider>
</ThemeProvider>
```

### 3. **기본 CRUD 작업**
- ✅ Create: `handleEventCreate()` 구현
- ✅ Update: `handleEventMove()` 구현
- ✅ Select: `selectEvent()` 연결
- ⚠️ Delete: 구현되지 않음

### 4. **UI 시스템 연동**
- Toast 알림 시스템 사용
- 동일한 테마 시스템 적용

## ❌ 연결이 필요한 부분

### 1. **인증 시스템**
- One Line 페이지에 인증 체크 없음
- 로그인하지 않은 사용자도 접근 가능
- 사용자 정보 연동 안 됨

### 2. **네비게이션**
```typescript
// 누락된 기능:
- 헤더/사이드바 없음
- 설정 패널 접근 불가
- Classic 모드로 돌아갈 방법 없음
```

### 3. **API 연동**
```typescript
// One Line 모드에서 누락:
- Google Calendar 동기화
- 서버에 이벤트 저장
- 실시간 업데이트
```

### 4. **친구/공유 기능**
- 친구 일정 보기 불가
- 일정 공유 기능 없음
- 협업 기능 미연동

### 5. **AI 채팅 통합**
- DayViewChatService만 사용 (제한적)
- UnifiedChatService 미연동
- AIOverlayDashboard와 분리됨

## 🔧 필요한 개선 사항

### 1. **레이아웃 통합**
```typescript
// One Line 페이지에 필요:
- UnifiedHeader 추가
- UnifiedSidebar 추가
- 네비게이션 메뉴
```

### 2. **인증 보호**
```typescript
// 인증 체크 추가 필요:
useEffect(() => {
  if (!isAuthenticated) {
    router.push('/login');
  }
}, [isAuthenticated]);
```

### 3. **API 통합**
```typescript
// 이벤트 변경 시 서버 동기화:
const handleEventMove = async (eventId, newTime) => {
  // 로컬 업데이트
  setEvents(updatedEvents);

  // 서버 동기화 (현재 없음)
  await updateEventOnServer(eventId, updatedEvent);
};
```

### 4. **완전한 CRUD**
```typescript
// Delete 기능 추가
const handleEventDelete = async (eventId: string) => {
  await deleteEvent(eventId);
  setEvents(events.filter(e => e.id !== eventId));
};
```

### 5. **채팅 서비스 통합**
```typescript
// UnifiedChatService로 업그레이드
import { UnifiedChatService } from '@/services/UnifiedChatService';
```

## 📊 통합 점수: 40/100

### 점수 분석
- ✅ 데이터 공유: 20/20
- ✅ Provider 통합: 10/10
- ⚠️ UI 컴포넌트: 5/20
- ❌ API 연동: 0/20
- ❌ 인증: 0/10
- ❌ 네비게이션: 0/10
- ⚠️ 채팅: 5/10

## 💡 결론

**현재 상태**: One Line 모드는 "데이터는 공유하지만 독립적으로 작동하는" 페이지입니다.

**필요한 작업**:
1. 공통 레이아웃 적용
2. 인증 시스템 통합
3. API 연동 구현
4. 네비게이션 추가
5. 완전한 CRUD 구현

**권장사항**: One Line 페이지를 독립 페이지가 아닌 Dashboard의 뷰 모드로 재구현하거나, 최소한 공통 레이아웃과 인증을 적용해야 합니다.