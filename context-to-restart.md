📅 Geulpi AI Calendar Assistant - Context to Restart
📊 현재 상태

프로젝트명: Geulpi AI Calendar Assistant

목적: 자연어 기반 스마트 캘린더 어시스턴트 (Google Calendar + Gemini AI)

현재 단계: Phase 3 완료 (2025-01-30)

구현 완료

Phase 1: Next.js 구조, Google OAuth, 캘린더 UI, Gemini API 연동, 기본 NLP

Phase 2: 서비스 레이어, 타입 안정성, Zustand, Socket.io, React Query, Google Calendar API 연동, Gemini 고급 기능, NLP 파이프라인, 음성 인터페이스, 테스트 환경

Phase 3: 고급 AI 기능 및 분석
- ✅ 팀 일정 조율 알고리즘 (TeamScheduler)
- ✅ 회의 준비 자동화 (MeetingPreparationService)
- ✅ 스마트 알림 시스템 (NotificationManager, NotificationScheduler, NotificationCenter)
- ✅ 분석 대시보드 (AnalyticsService, Recharts 차트 컴포넌트)
- ✅ TypeScript 타입 정합성 개선 (타입 변환 유틸리티, GeminiService 개선)

알려진 이슈

Socket.io 연결이 간헐적으로 끊김

음성 인식이 Chrome/Edge에서만 완전 지원

Gemini API 응답 속도 최적화 필요

일부 TypeScript 타입 오류 존재 (외부 라이브러리 관련 - 기능에는 영향 없음)

Phase 4 (계획):

외부 서비스 통합
- Slack Webhook 연동
- Zoom API 통합
- Gmail API 기반 메일 파싱

PWA 기능
- Service Worker 구현
- Manifest.json 설정
- FCM 푸시 알림

성능 최적화
- 토큰 갱신 자동화
- 에러 바운더리 구현
- 로딩 상태 개선
- 접근성 향상

🛠 기술/환경
Frontend

Next.js 14.2.14 (App Router)

TypeScript 5.6.3 (strict)

Tailwind CSS 3.4.13

Zustand 5.0.8 (+ Immer)

React Query 5.85.5

Backend & APIs

Google OAuth 2.0

Google Calendar API

Google Gemini 1.5 Flash

Socket.io 4.8.1

DevOps & Testing

Vitest 3.2.4 + Testing Library

Node >= 18.17.0

npm

주요 파일 구조
geulpi-project-10/
├── src/
│   ├── app/ (Next.js App Router)
│   │   ├── analytics/page.tsx (분석 대시보드)
│   │   └── ...
│   ├── services/ (비즈니스 로직)
│   │   ├── ai/
│   │   │   ├── GeminiService.ts (개선됨)
│   │   │   ├── MeetingPreparation.ts
│   │   │   └── ...
│   │   ├── analytics/
│   │   │   └── AnalyticsService.ts
│   │   ├── calendar/
│   │   │   ├── TeamScheduler.ts
│   │   │   └── SmartScheduler.ts
│   │   ├── notification/
│   │   │   ├── NotificationManager.ts
│   │   │   └── NotificationScheduler.ts
│   │   └── ...
│   ├── store/ (Zustand Stores)
│   │   ├── notificationStore.ts
│   │   ├── authStore.ts
│   │   └── ...
│   ├── components/
│   │   ├── analytics/ (차트 컴포넌트)
│   │   ├── NotificationCenter.tsx
│   │   └── ...
│   ├── utils/
│   │   └── typeConverters.ts (타입 변환 유틸리티)
│   ├── types/
│   │   ├── index.ts
│   │   └── calendar.ts
│   └── ...
├── .env.local
├── package.json
├── context-to-restart.md
└── SIMPLIFIED_ARCHITECTURE.md

환경 변수

Google OAuth: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

APIs: GOOGLE_API_KEY, GEMINI_API_KEY

NextAuth: NEXTAUTH_URL, NEXTAUTH_SECRET

📌 정합성 유지 규칙

Single Source of Truth: 타입 정의와 스키마 기반으로 모든 코드 작성

모듈 단위 작성: Controller + Service + Store + Test 세트 단위

테스트 우선: 새로운 기능은 반드시 단위 테스트/통합 테스트 포함

정적 검사 통과 필수:

TypeScript strict 모드

npm run type-check 무오류

ESLint, Prettier 통과

변경 시 규칙:

기존 파일과 시그니처 충돌 시 원인 분석 + 수정안 제시

중복 타입/DTO 정의 금지

🚀 다음 세션 지침

Phase 4 우선 작업:

1. 외부 서비스 통합
   - Slack Webhook 설정 및 알림 연동
   - Zoom API로 회의 링크 자동 생성
   - Gmail API로 메일 기반 일정 추출

2. PWA 기능 구현
   - Service Worker 작성
   - manifest.json 설정
   - 오프라인 지원
   - FCM 푸시 알림

3. 성능 및 안정성
   - 토큰 자동 갱신 로직
   - React Error Boundary
   - Suspense 적용
   - 웹 접근성 개선

4. 테스트 커버리지 확대
   - E2E 테스트 추가
   - 통합 테스트 강화

📝 Changelog

2025-01-30: Phase 3 완료.

고급 AI 기능 및 분석 구현:
- TeamScheduler: 팀 일정 조율 알고리즘 (참가자 우선순위, 시간대 고려, 팀 생산성 패턴 학습)
- MeetingPreparationService: 회의 준비 자동화 (아젠다 생성, 자료 수집, 준비 태스크 생성, 회의 후 요약)
- NotificationManager: 스마트 알림 관리 (리마인더, 출발 알림, 회의 준비, 일정 충돌 감지)
- NotificationScheduler: 알림 스케줄링 및 처리
- NotificationCenter: 알림 UI 컴포넌트
- notificationStore: Zustand 기반 알림 상태 관리
- AnalyticsService: 시간 통계, 생산성 지표, 카테고리 분석, 히트맵, AI 인사이트
- Analytics Dashboard: TimeStatisticsCard, ProductivityChart, CategoryPieChart, HeatmapCalendar, InsightsList
- Recharts 통합: 데이터 시각화 라이브러리

TypeScript 정합성 개선:
- typeConverters.ts: Google Calendar API ↔ 내부 타입 변환 유틸리티
- GeminiService 개선: 필요 메서드 추가 및 접근성 개선
- 타입 정의 확장: TeamScheduler, Analytics 관련 타입
- 40개 테스트 모두 통과

2025-08-29: Phase 2 완료.

서비스 레이어 구현, Zustand/React Query 적용, Socket.io 연동, Google Calendar API/Gemini AI 고급 기능 통합, 음성 인터페이스 구축, Vitest 환경 세팅.

다음 세션 목표: Phase 4 - 외부 서비스 통합 (Slack, Zoom, Gmail API), PWA 기능 추가 (Service Worker, Manifest, Push Notifications), 성능 최적화.

✅ 자동 업데이트 체크리스트 (세션 종료 시)

현재 상태: 단계, 완료 항목, 이슈, TODO 갱신

기술/환경: 새 의존성, 버전, 주요 구조 변경 반영

정합성 규칙: 필요 시 보강/수정

다음 세션 지침: 우선순위 작업 정리

Changelog: 이번 세션에 달성한 변경점 기록