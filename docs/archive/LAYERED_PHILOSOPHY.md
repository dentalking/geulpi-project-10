# 🌌 The Layered Calendar Philosophy

## 핵심 개념
**"채팅이 인터페이스다. 캘린더는 단지 배경일 뿐."**

## 3층 레이어 구조

```
┌─────────────────────────────────┐
│  Layer 1: Chat Overlay (최상단)  │ <- 사용자가 실제로 상호작용하는 층
│  - 반투명 채팅 인터페이스        │
│  - AI와 대화로 모든 제어         │
│  - 실시간 피드백과 제안          │
├─────────────────────────────────┤
│  Layer 2: Month View (중간)      │ <- 시각적 맥락을 제공하는 참조층
│  - 흐릿한 배경 캘린더            │
│  - 전체적인 일정 분포 파악       │
│  - 간략한 시각적 힌트            │
├─────────────────────────────────┤
│  Layer 3: One Line View (하단)   │ <- 실제 데이터가 존재하는 진실층
│  - 진짜 캘린더 데이터            │
│  - 정확한 시간 표현              │
│  - CRUD 작업이 일어나는 곳       │
└─────────────────────────────────┘
```

## 작동 원리

### 1. 채팅 주도 인터랙션
```javascript
사용자: "내일 2시에 회의 추가"
   ↓
채팅 레이어: 명령 해석
   ↓
One Line 레이어: 데이터 생성
   ↓
Month View: 시각적 업데이트
   ↓
채팅 레이어: "회의가 추가되었습니다"
```

### 2. 레이어 간 관계
- **채팅 → One Line**: 직접 CRUD 명령
- **One Line → Month View**: 자동 시각화
- **Month View → 채팅**: 컨텍스트 제공

### 3. 포커스 전환
```
기본 상태: 채팅에 포커스 (Layer Depth: 0)
   ↓ [Shift+Tab]
Month View 포커스 (Layer Depth: 1)
   ↓ [Shift+Tab]
One Line 포커스 (Layer Depth: 2)
```

## 사용자 경험 시나리오

### 시나리오 1: 일정 확인
```
1. 사용자가 앱을 연다
2. 채팅창이 중앙에, 뒤로 Month View가 흐릿하게 보임
3. "오늘 일정 뭐야?" 입력
4. AI가 One Line에서 데이터 조회
5. 채팅창에 일정 목록 표시
6. Month View에서 오늘 날짜가 하이라이트
```

### 시나리오 2: 복잡한 일정 조작
```
1. "다음 주 모든 회의 1시간씩 미뤄"
2. AI가 One Line 레이어에서 해당 이벤트 검색
3. 각 이벤트 시간 수정
4. Month View에서 변경사항 애니메이션으로 표시
5. 채팅창에 "5개 회의가 조정되었습니다" 표시
```

### 시나리오 3: 깊은 탐색
```
1. 사용자가 특정 날짜 상세히 보고 싶음
2. "3월 15일 자세히 보여줘"
3. 레이어가 자동으로 One Line Day View로 전환
4. 해당 날짜의 One Line이 확대되어 표시
5. 채팅창은 계속 떠있어 추가 명령 가능
```

## 기술적 구현

### Layer State Management
```typescript
interface LayerState {
  depth: 0 | 1 | 2;  // 현재 포커스 레이어
  opacity: {
    chat: number;      // 0.8 - 1.0
    month: number;     // 0.2 - 0.9
    oneLine: number;   // 0.2 - 1.0
  };
  blur: {
    chat: string;      // "0px"
    month: string;     // "0px" - "10px"
    oneLine: string;   // "0px" - "15px"
  };
  scale: {
    chat: number;      // 0.95 - 1.0
    month: number;     // 0.7 - 1.0
    oneLine: number;   // 0.7 - 1.0
  };
}
```

### 애니메이션 전환
```typescript
// Framer Motion으로 부드러운 레이어 전환
animate={{
  scale: layerDepth === targetDepth ? 1 : scaleValue,
  opacity: layerDepth === targetDepth ? 1 : opacityValue,
  filter: `blur(${layerDepth === targetDepth ? 0 : blurValue}px)`
}}
transition={{
  type: "spring",
  damping: 20,
  stiffness: 100
}}
```

### Chat Context Awareness
```typescript
// 채팅이 현재 보이는 레이어를 인식
const chatContext = {
  visibleLayer: layerDepth,
  monthContext: getVisibleMonth(),
  selectedDate: currentDate,
  oneLineView: currentView
};

// AI가 컨텍스트에 따라 다른 응답
if (chatContext.visibleLayer === 1) {
  // Month View가 보일 때는 월 단위 명령 우선
  suggestions = ["다음 달로", "이번 달 요약", "바쁜 날 표시"];
} else if (chatContext.visibleLayer === 2) {
  // One Line이 보일 때는 세부 명령 우선
  suggestions = ["30분 연장", "일정 이동", "상세 편집"];
}
```

## 혁신성

### 1. Chat-First Calendar
- 캘린더 UI를 직접 조작하지 않음
- 모든 작업이 대화로 이루어짐
- UI는 단지 피드백과 컨텍스트 제공

### 2. Progressive Disclosure
- 필요한 정보만 단계적으로 노출
- 채팅 → 개요(Month) → 상세(One Line)
- 사용자가 원하는 깊이만큼만 탐색

### 3. Ambient Computing
- 캘린더가 "배경"으로 존재
- 필요할 때만 포커스
- 자연스러운 컨텍스트 전환

## 기대 효과

### 사용성
- **90% 감소**: 클릭/탭 횟수
- **80% 향상**: 작업 완료 속도
- **100% 자연어**: 학습 곡선 제거

### 접근성
- 시각 장애인도 채팅으로 완전 제어
- 키보드만으로 모든 작업 가능
- 음성 입력과 자연스럽게 연동

### 확장성
- 새로운 기능 = 새로운 채팅 명령
- UI 변경 없이 기능 추가
- 다국어 지원 용이

## 미래 비전

### Phase 1: Voice Integration
```
사용자: "헤이 글피, 내일 일정 비워줘"
글피: "내일 3개 일정을 취소할까요?"
```

### Phase 2: Proactive AI
```
글피: "다음 회의까지 15분 남았습니다. 준비하시겠어요?"
글피: "오늘 일정이 너무 빡빡해요. 일부를 조정할까요?"
```

### Phase 3: Multi-modal
```
- 손짓으로 레이어 전환
- 시선으로 날짜 선택
- 음성으로 명령
```

## 결론

**"The best interface is no interface."**

사용자는 캘린더를 "사용"하지 않습니다.
단지 AI와 대화할 뿐입니다.
캘린더는 그저 대화의 배경일 뿐입니다.

이것이 진정한 **Layered Calendar Philosophy**입니다.