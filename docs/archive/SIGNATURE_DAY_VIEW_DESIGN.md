# 🎨 Geulpi Signature Day View Template Design

## 핵심 컨셉
**"하루를 한 눈에, 모든 상세를 한 곳에"**
- Day View가 서비스의 핵심 UI 템플릿
- 채팅으로 실시간 편집 가능
- 모든 상세 화면이 이 템플릿 기반으로 구성

## 1. 시그니처 Day View 구조

### 📐 레이아웃 (3-Column Design)
```
┌─────────────────────────────────────────┐
│          [날짜 헤더 & 네비게이션]          │
├──────────┬─────────────────┬────────────┤
│  시간축   │   메인 이벤트    │  AI 패널   │
│  (Left)  │    (Center)     │  (Right)  │
│          │                 │           │
│  06:00   │  ┌──────────┐  │  💬 채팅   │
│    |     │  │ Morning  │  │           │
│  09:00   │  │ Routine  │  │  📝 메모   │
│    |     │  └──────────┘  │           │
│  12:00   │  ┌──────────┐  │  🎯 추천   │
│    |     │  │  Lunch   │  │           │
│  15:00   │  │  Meeting │  │  ⚡ 액션   │
│    |     │  └──────────┘  │           │
│  18:00   │                 │           │
│    |     │  [빈 시간 슬롯]  │  📊 통계   │
│  21:00   │                 │           │
└──────────┴─────────────────┴────────────┘
```

### 🎯 핵심 특징
1. **시간축 (Timeline)**
   - 24시간 또는 업무시간 토글
   - 현재 시간 라인 표시
   - 30분 단위 그리드

2. **이벤트 카드**
   - 노션 스타일 블록
   - 드래그 & 드롭으로 시간 변경
   - 인라인 편집 가능

3. **AI 채팅 패널**
   - 컨텍스트 인식 명령
   - "2시 미팅 30분 연장해줘"
   - "오전 일정 모두 1시간씩 미뤄줘"

## 2. 채팅 편집 기능

### 💬 자연어 명령 예시
```typescript
interface ChatCommands {
  // 시간 변경
  "미팅 2시로 옮겨줘"
  "점심 시간 30분 연장"
  "오전 일정 모두 1시간 뒤로"

  // 일정 추가
  "3시에 커피 브레이크 추가"
  "내일 이 시간에 같은 일정 복사"

  // 일정 수정
  "미팅 제목을 '프로젝트 킥오프'로 변경"
  "장소 강남역으로 수정"

  // 스타일링
  "중요 일정 빨간색으로 표시"
  "반복 일정 투명도 낮춰줘"
}
```

### 🎨 시각적 피드백
- 편집 중인 일정 하이라이트
- 변경사항 미리보기 (고스트 효과)
- 실행 취소/다시 실행 지원

## 3. 통합 컴포넌트 시스템

### 📦 Day View 기반 컴포넌트들

```typescript
// 1. 아티팩트 패널
<ArtifactDayView>
  - Day View 미니어처 버전
  - 클릭하면 해당 날짜로 이동
  - 주요 일정만 표시
</ArtifactDayView>

// 2. 이벤트 상세 모달
<EventDetailDayView>
  - 해당 일정이 있는 하루 전체 컨텍스트
  - 전후 일정과의 관계 표시
  - 시간 조정 시 충돌 시각화
</EventDetailDayView>

// 3. 주간 뷰 (7개의 Day View)
<WeeklyDayViews>
  - 7개의 세로 Day View 나란히
  - 수평 스크롤
  - 일정 간 드래그 앤 드롭
</WeeklyDayViews>
```

## 4. 구현 계획

### Phase 1: Core Day View Template
```typescript
interface DayViewTemplate {
  date: Date;
  events: Event[];
  timeRange: { start: number; end: number };
  gridInterval: 30 | 60; // minutes

  // 채팅 편집 인터페이스
  chatEditor: {
    enabled: boolean;
    commands: ChatCommand[];
    preview: boolean;
  };

  // 스타일 커스터마이징
  theme: {
    timeline: TimelineStyle;
    eventCard: EventCardStyle;
    emptySlot: EmptySlotStyle;
  };
}
```

### Phase 2: Chat Integration
- Natural Language Processing
- Command Parser
- Visual Preview System
- Undo/Redo Stack

### Phase 3: Component Unification
- Artifact Panel Migration
- Event Detail Modal Update
- Weekly View Implementation

## 5. 기대 효과

### ✅ 사용자 경험
- **일관성**: 모든 화면에서 동일한 패턴
- **직관성**: Day View만 익히면 전체 서비스 사용 가능
- **효율성**: 채팅으로 빠른 편집

### ✅ 개발 효율성
- **재사용성**: 하나의 템플릿으로 여러 뷰 생성
- **유지보수**: 중앙집중식 컴포넌트 관리
- **확장성**: 새로운 기능도 Day View 기반으로 추가

## 6. 차별화 포인트

### 🌟 Geulpi만의 시그니처
1. **시간 중심 UI**: 하루의 흐름을 직관적으로 표현
2. **AI 채팅 편집**: 자연어로 일정 관리
3. **컨텍스트 보존**: 어느 화면에서든 하루 전체 맥락 유지
4. **유연한 그리드**: 30분/1시간 단위 자유 전환

## 7. 기술 스택

```typescript
// Core Technologies
- React + TypeScript
- Framer Motion (애니메이션)
- DnD Kit (드래그 앤 드롭)
- Tailwind CSS (스타일링)

// AI Integration
- Natural Language Processing
- Command Pattern Implementation
- Real-time Preview Engine

// State Management
- EventContext (중앙 상태)
- Optimistic Updates
- Conflict Resolution
```

## 다음 단계

1. **프로토타입 개발**
   - 기본 Day View Template 구현
   - 시간축과 이벤트 카드 렌더링

2. **채팅 편집 시스템**
   - 명령어 파서 구현
   - 시각적 피드백 시스템

3. **컴포넌트 통합**
   - 아티팩트 패널 마이그레이션
   - 상세 모달 업데이트

이 접근 방식으로 Geulpi만의 독특하고 일관된 사용자 경험을 만들 수 있을 것입니다.