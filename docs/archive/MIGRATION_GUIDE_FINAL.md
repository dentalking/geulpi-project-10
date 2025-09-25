# 🚀 최종 마이그레이션 가이드

## 📅 마이그레이션 일정
- **Phase 1**: ✅ 완료 (기본 컴포넌트 생성)
- **Phase 2**: ✅ 완료 (EventContext 통합)
- **Phase 3**: 🔄 진행중 (프로덕션 준비)

## 🔄 마이그레이션 단계별 가이드

### 1단계: 준비 작업 (✅ 완료)

#### 생성된 파일
- `src/components/UnifiedEventModal.tsx` - 통합 이벤트 모달
- `src/components/OptimizedDayView.tsx` - 최적화된 일간뷰
- `src/contexts/EventContext.tsx` - 중앙 상태 관리
- `src/components/EventsArtifactPanelWithContext.tsx` - Context 통합 wrapper
- `src/utils/performanceMonitor.ts` - 성능 측정 도구

### 2단계: 기존 컴포넌트 교체

#### 이벤트 모달 교체
**기존 코드:**
```tsx
import { AIEventDetailModal } from '@/components/AIEventDetailModal';
// 또는
import { UnifiedEventDetailModal } from '@/components/UnifiedEventDetailModal';
// 또는
import { EnhancedEventDetailModal } from '@/components/EnhancedEventDetailModal';
```

**새 코드:**
```tsx
import { UnifiedEventModal } from '@/components/UnifiedEventModal';

// 사용법
<UnifiedEventModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  event={selectedEvent}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onChat={handleChat}
  onShare={handleShare}
  locale={locale}
  enableAI={true}  // AI 기능 활성화
/>
```

#### 일간뷰 교체
**기존 코드 (SimpleCalendar.tsx):**
```tsx
{viewType === 'day' ? (
  /* 기존 원형 시계 일간 뷰 */
  <div style={{ position: 'relative', ... }}>
    {/* 복잡한 렌더링 로직 */}
  </div>
) : ...}
```

**새 코드:**
```tsx
import { OptimizedDayView } from './OptimizedDayView';

{viewType === 'day' ? (
  <OptimizedDayView
    events={events}
    selectedDate={selectedDate}
    onEventClick={handleEventClick}
    onTimeSlotClick={handleTimeSlotClick}
    locale={locale}
  />
) : ...}
```

### 3단계: EventContext 도입

#### 기존 상태 관리
```tsx
// 각 컴포넌트에서 개별 상태 관리
const [events, setEvents] = useState([]);
const [selectedEvent, setSelectedEvent] = useState(null);
const [isArtifactOpen, setIsArtifactOpen] = useState(false);
// ... 등등
```

#### 새로운 중앙 상태 관리
```tsx
// 최상위 컴포넌트 (예: _app.tsx 또는 layout.tsx)
import { EventProvider } from '@/contexts/EventContext';

<EventProvider initialEvents={events}>
  <YourApp />
</EventProvider>

// 하위 컴포넌트에서 사용
import { useEvents, useArtifactPanel } from '@/contexts/EventContext';

function YourComponent() {
  const { events, selectedEvent, selectEvent, updateEvent } = useEvents();
  const { isOpen, toggle, events: artifactEvents } = useArtifactPanel();

  // 모든 상태가 자동으로 동기화됨
}
```

### 4단계: 아티팩트 패널 통합

#### 기존 방식
```tsx
<EventsArtifactPanel
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  events={events}
  // ... 많은 props
/>
```

#### 새로운 Context 통합 방식
```tsx
import { EventsArtifactPanelWithContext } from '@/components/EventsArtifactPanelWithContext';

// EventProvider 내부에서 사용
<EventsArtifactPanelWithContext
  locale="ko"
  title="일정 아티팩트"
  // props 대폭 감소 - Context에서 자동 관리
/>
```

## 🗑 제거할 컴포넌트 목록

### 즉시 제거 가능
- ❌ `AIEventDetailModal.tsx`
- ❌ `EnhancedEventDetailModal.tsx`
- ❌ `UnifiedEventDetailModal.tsx` (기존 버전)

### 점진적 제거 (안정화 후)
- ⏳ 기존 일간뷰 코드 (SimpleCalendar.tsx 내부)
- ⏳ 개별 상태 관리 로직

## 📊 성능 개선 측정

### 측정 방법
```tsx
// 컴포넌트에 성능 모니터링 추가
import { usePerformanceMonitor } from '@/utils/performanceMonitor';

function YourComponent() {
  usePerformanceMonitor('ComponentName', dataCount);

  // 컴포넌트 로직
}

// 콘솔에서 리포트 확인
perfMonitor.generateReport();
```

### 예상 개선 효과
| 항목 | 기존 | 신규 | 개선율 |
|-----|-----|-----|-------|
| 일간뷰 렌더링 | ~150ms | ~50ms | 67% ⬇️ |
| 모달 열기 | ~80ms | ~30ms | 63% ⬇️ |
| 메모리 사용량 | ~45MB | ~30MB | 33% ⬇️ |
| 코드 크기 | 150KB | 100KB | 33% ⬇️ |

## 🧹 클린업 체크리스트

### 1. 파일 제거
```bash
# 백업 생성 (안전을 위해)
mkdir -p backup/deprecated
cp src/components/AIEventDetailModal.tsx backup/deprecated/
cp src/components/EnhancedEventDetailModal.tsx backup/deprecated/
cp src/components/UnifiedEventDetailModal.tsx backup/deprecated/

# 파일 제거
rm src/components/AIEventDetailModal.tsx
rm src/components/EnhancedEventDetailModal.tsx
rm src/components/UnifiedEventDetailModal.tsx
```

### 2. Import 정리
```bash
# 제거할 import 검색
grep -r "AIEventDetailModal" src/
grep -r "EnhancedEventDetailModal" src/
grep -r "UnifiedEventDetailModal" src/
```

### 3. 미사용 의존성 제거
```bash
# 필요없어진 패키지 확인
npm prune
npm dedupe
```

## ⚠️ 주의사항

### 병렬 운영 기간
1. **2주간 병렬 운영** 권장
2. 기존 컴포넌트와 새 컴포넌트 동시 유지
3. A/B 테스트로 안정성 검증
4. 사용자 피드백 수집

### 롤백 계획
문제 발생 시:
```bash
# Git으로 되돌리기
git revert <commit-hash>

# 또는 특정 파일만 복원
git checkout <previous-commit> -- src/components/AIEventDetailModal.tsx
```

## 🎯 최종 목표

### 완료 기준
- [ ] 모든 이벤트 모달이 UnifiedEventModal로 통합
- [ ] 일간뷰가 OptimizedDayView로 교체
- [ ] EventContext로 모든 상태 관리 통합
- [ ] 성능 개선 50% 이상 달성
- [ ] 프로덕션 빌드 성공
- [ ] E2E 테스트 통과

### 검증 방법
1. **기능 테스트**
   - 이벤트 CRUD 작동 확인
   - 아티팩트 패널 동기화 확인
   - AI 기능 정상 작동

2. **성능 테스트**
   ```javascript
   // 브라우저 콘솔에서
   perfMonitor.generateReport()
   ```

3. **빌드 테스트**
   ```bash
   npm run build
   npm run start
   ```

## 📈 모니터링

### 프로덕션 배포 후
1. **성능 모니터링**
   - Core Web Vitals 확인
   - 메모리 사용량 추적
   - 에러 로그 모니터링

2. **사용자 피드백**
   - 응답 속도 개선 체감
   - UI/UX 일관성
   - 버그 리포트

## 🎉 마이그레이션 완료

모든 단계 완료 시:
1. 구 컴포넌트 제거
2. 문서 업데이트
3. 팀 공유
4. 성공 축하! 🚀

---

*작성일: 2025-09-19*
*버전: 1.0.0*
*작성자: Claude Assistant*