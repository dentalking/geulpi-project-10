# 성능 최적화 가이드

## 현재 성능 문제점

### 1. 번들 사이즈 (518KB)
- First Load JS가 518KB로 매우 큼
- 주요 원인:
  - `discord.js`: 사용하지 않는 것으로 보임 (제거 가능)
  - `googleapis`: 전체 라이브러리 import
  - `@react-google-maps/api`: 무거운 지도 라이브러리

### 2. 과도한 API 호출
- AIOverlayDashboard: 500ms → 2000ms로 수정 완료
- 폴링 대신 WebSocket 사용 검토

### 3. 동적 서버 렌더링
- 많은 API 라우트가 정적 최적화되지 않음
- cookies 사용으로 인한 동적 렌더링

## 성능 개선 방안

### 단기 개선 (즉시 적용 가능)

1. **폴링 간격 최적화** ✅
   - AIOverlayDashboard: 500ms → 2000ms

2. **불필요한 의존성 제거**
   ```bash
   npm uninstall discord.js
   ```

3. **이미지 최적화**
   - Next.js Image 컴포넌트 사용
   - WebP 포맷 사용

4. **API 응답 캐싱**
   ```typescript
   // API 라우트에 캐시 헤더 추가
   headers: {
     'Cache-Control': 's-maxage=10, stale-while-revalidate'
   }
   ```

### 중기 개선 (1-2주)

1. **코드 스플리팅 강화**
   - dynamic import 활용
   - 라우트별 번들 분리

2. **Google APIs 최적화**
   - 필요한 서비스만 선택적 import
   ```typescript
   // Bad
   import { google } from 'googleapis';

   // Good
   import { calendar_v3 } from 'googleapis';
   ```

3. **React Query 캐싱 최적화**
   - staleTime 증가
   - cacheTime 조정

4. **데이터베이스 쿼리 최적화**
   - 인덱스 추가
   - N+1 쿼리 해결

### 장기 개선 (1개월+)

1. **WebSocket 구현**
   - 폴링 제거
   - 실시간 업데이트

2. **Edge Functions 활용**
   - Vercel Edge Runtime
   - 지역별 캐싱

3. **PWA 구현**
   - Service Worker
   - 오프라인 지원

4. **SSG/ISR 활용**
   - 정적 페이지 생성
   - Incremental Static Regeneration

## 측정 지표

### 현재 상태
- First Load JS: 518KB
- API 응답 시간: 측정 필요
- Core Web Vitals: 측정 필요

### 목표
- First Load JS: < 200KB
- API 응답 시간: < 500ms
- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

## 즉시 적용 가능한 최적화

```typescript
// 1. Dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
});

// 2. Image optimization
<Image
  src={imageSrc}
  alt="Description"
  width={300}
  height={200}
  loading="lazy"
  placeholder="blur"
/>

// 3. API caching
export const revalidate = 60; // Revalidate every 60 seconds

// 4. Debounced search
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 300),
  []
);
```

## 모니터링 도구

1. **Vercel Analytics**
   - Web Vitals 측정
   - 실시간 성능 모니터링

2. **Chrome DevTools**
   - Lighthouse 사용
   - Performance 탭 분석

3. **Bundle Analyzer**
   ```bash
   npm run build:analyze
   ```

## 실행 계획

1. ✅ 폴링 간격 2초로 변경
2. ⏳ discord.js 제거
3. ⏳ googleapis selective import
4. ⏳ 이미지 최적화
5. ⏳ API 캐싱 구현