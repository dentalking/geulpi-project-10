# 통합 테스트 가이드

## 🧪 테스트 환경 설정

### 개발 서버 실행
```bash
npm run dev
```

## 📍 테스트 URL

### 1. 통합 대시보드 (새 버전)
```
http://localhost:3000/test-integration
```
**테스트 항목:**
- ✅ EventContext 통합
- ✅ EventsArtifactPanelWithContext
- ✅ OptimizedDayView
- ✅ UnifiedEventModal

### 2. 기존 대시보드 (안정 버전)
```
http://localhost:3000/ko/dashboard
```
**비교 항목:**
- 기존 기능 정상 작동 확인
- 성능 비교

## ✅ 테스트 시나리오

### A. 아티팩트 패널 ↔ 캘린더 동기화

1. **이벤트 생성 동기화**
   - [ ] AI 채팅으로 이벤트 생성
   - [ ] 아티팩트 패널에 즉시 표시 확인
   - [ ] 캘린더 뷰에 반영 확인

2. **이벤트 수정 동기화**
   - [ ] 아티팩트 패널에서 이벤트 수정
   - [ ] 캘린더 뷰 자동 업데이트 확인
   - [ ] 반대로 캘린더에서 수정 → 아티팩트 반영 확인

3. **이벤트 삭제 동기화**
   - [ ] 아티팩트 패널에서 삭제
   - [ ] 캘린더에서 즉시 사라지는지 확인

### B. 일간뷰 (OptimizedDayView) 테스트

1. **성능 테스트**
   - [ ] 많은 이벤트 (50+) 렌더링 속도
   - [ ] 시간대 클릭 반응성
   - [ ] 애니메이션 부드러움

2. **반응형 테스트**
   - [ ] 브라우저 크기 변경 시 적응
   - [ ] 모바일 뷰포트 테스트

3. **접근성**
   - [ ] 키보드 네비게이션 (Tab, Enter, Esc)
   - [ ] 스크린 리더 호환성

### C. UnifiedEventModal 테스트

1. **기능 통합**
   - [ ] 상세정보 탭 정상 표시
   - [ ] AI 분석 탭 활성화 확인
   - [ ] 편집/삭제 기능 작동

2. **일관성**
   - [ ] 모든 뷰에서 동일한 모달 UI
   - [ ] 날짜 포맷 일관성
   - [ ] 다국어 지원

### D. EventContext 상태 관리

1. **상태 공유**
   - [ ] 모든 컴포넌트가 동일한 이벤트 목록 공유
   - [ ] 선택된 이벤트 상태 동기화
   - [ ] 검색/필터 상태 유지

2. **성능**
   - [ ] 불필요한 리렌더링 없음
   - [ ] 메모이제이션 효과 확인

## 🔍 디버깅 방법

### Console 로그 확인
```javascript
// 브라우저 콘솔에서
localStorage.setItem('debug', 'true');
```

### React DevTools
1. EventProvider 상태 확인
2. useEvents 훅 호출 추적
3. 리렌더링 프로파일링

### Network 탭
- API 호출 중복 체크
- 응답 시간 모니터링

## 📊 성능 벤치마크

### 측정 항목
| 항목 | 기존 버전 | 통합 버전 | 개선율 |
|-----|---------|---------|-------|
| 초기 로드 시간 | - | - | - |
| 이벤트 100개 렌더링 | - | - | - |
| 모달 열기 속도 | - | - | - |
| 메모리 사용량 | - | - | - |

### 측정 도구
```javascript
// Performance API 사용
performance.mark('start');
// ... 작업 수행
performance.mark('end');
performance.measure('operation', 'start', 'end');
console.log(performance.getEntriesByType('measure'));
```

## 🐛 알려진 이슈

### 1. 포트 충돌
```bash
# 해결방법
lsof -ti:3000 | xargs kill -9
```

### 2. TypeScript 에러
```bash
# 체크 명령
npm run type-check
```

### 3. 캐시 문제
```bash
# 캐시 클리어
rm -rf .next
npm run dev
```

## ✨ 체크리스트

### Phase 2 완료 기준
- [x] EventContext 생성 및 적용
- [x] EventsArtifactPanelWithContext 구현
- [x] IntegratedCalendarDashboard 통합
- [ ] 모든 동기화 테스트 통과
- [ ] 성능 벤치마크 완료
- [ ] 버그 없음 확인

### Phase 3 준비
- [ ] 프로덕션 빌드 테스트
- [ ] 기존 컴포넌트 제거 계획
- [ ] 마이그레이션 가이드 작성

## 📝 피드백 기록

### 긍정적인 부분
-

### 개선이 필요한 부분
-

### 추가 기능 제안
-

---

*테스트 일자: 2025-09-19*
*테스터: _______*
*버전: Phase 2 Integration*