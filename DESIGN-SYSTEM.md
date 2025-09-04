# 📐 Geulpi Design System Guide

## 개요
이 문서는 Geulpi 프로젝트의 일관된 디자인 시스템 적용을 위한 가이드입니다.

## 🎨 디자인 원칙

### 1. 미니멀리즘
- 불필요한 요소 제거
- 명확한 정보 위계
- 충분한 여백 활용

### 2. 일관성
- 통일된 색상 시스템
- 일관된 타이포그래피
- 표준화된 컴포넌트

### 3. 접근성
- 명확한 대비
- 읽기 쉬운 폰트 크기
- 키보드 네비게이션 지원

## 🎨 색상 시스템

### Primary Colors
```css
--color-black: #000000;
--color-white: #FFFFFF;
```

### Gray Scale (주요 사용)
```css
--color-gray-900: #000000;     /* 제목, 주요 텍스트 */
--color-gray-600: #515154;     /* 보조 텍스트 */
--color-gray-400: #86868B;     /* 설명 텍스트 */
--color-gray-200: #E8E8ED;     /* 경계선 */
--color-gray-100: #F5F5F7;     /* 배경 */
```

### Accent Colors
```css
--color-primary: #0071E3;      /* 주요 액션 */
--color-success: #34C759;      /* 성공 */
--color-error: #FF3B30;        /* 에러 */
--color-warning: #FF9500;      /* 경고 */
```

## 📝 타이포그래피

### Font Sizes (통일된 스케일)
```css
--text-xs: 11px;     /* 마이크로 텍스트 */
--text-sm: 13px;     /* 캡션, 라벨 */
--text-base: 15px;   /* 본문 */
--text-md: 17px;     /* 강조 본문 */
--text-lg: 19px;     /* 소제목 */
--text-xl: 22px;     /* 제목 3 */
--text-2xl: 28px;    /* 제목 2 */
--text-3xl: 34px;    /* 제목 1 */
--text-4xl: 48px;    /* 디스플레이 */
```

### Font Weights
```css
--font-regular: 400;  /* 본문 */
--font-medium: 500;   /* 강조 */
--font-semibold: 600; /* 제목 */
--font-bold: 700;     /* 헤드라인 */
```

## 📏 간격 시스템 (8pt Grid)

### Spacing Scale
```css
--space-0: 0px;
--space-1: 4px;      /* 최소 간격 */
--space-2: 8px;      /* 기본 단위 */
--space-3: 12px;     /* 작은 간격 */
--space-4: 16px;     /* 중간 간격 */
--space-6: 24px;     /* 큰 간격 */
--space-8: 32px;     /* 섹션 간격 */
--space-10: 40px;    /* 블록 간격 */
```

## 🔘 버튼 시스템

### Button Sizes
| Size | Padding | Height | Font Size | 사용 예시 |
|------|---------|--------|-----------|----------|
| xs   | 4px 12px | 28px | 11px | 태그, 칩 |
| sm   | 6px 16px | 32px | 13px | 보조 액션 |
| md   | 10px 20px | 40px | 15px | 기본 버튼 |
| lg   | 14px 32px | 48px | 17px | 주요 CTA |
| xl   | 18px 40px | 56px | 19px | 히어로 CTA |

### Button Variants
- **Primary**: 검정 배경, 흰색 텍스트 (주요 액션)
- **Secondary**: 흰색 배경, 검정 텍스트, 회색 테두리 (보조 액션)
- **Ghost**: 투명 배경, 파란색 텍스트 (링크 스타일)
- **Danger**: 빨간 배경, 흰색 텍스트 (삭제 등)

## 🎯 컴포넌트 사용 예시

### Button
```tsx
import { Button } from '@/components/ui';

// 주요 CTA
<Button variant="primary" size="lg">
  시작하기
</Button>

// 보조 액션
<Button variant="secondary" size="md">
  자세히 보기
</Button>

// 링크 스타일
<Button variant="ghost" size="sm">
  더 알아보기
</Button>
```

### Typography
```tsx
import { H1, Body, Caption } from '@/components/ui';

<H1>메인 제목</H1>
<Body>본문 텍스트입니다.</Body>
<Caption color="secondary">보조 설명</Caption>
```

### Layout
```tsx
import { Container, Card, Stack } from '@/components/ui';

<Container size="lg" padding="md">
  <Stack spacing="md">
    <Card variant="bordered" padding="lg">
      컨텐츠
    </Card>
  </Stack>
</Container>
```

## ✅ 체크리스트

### 새로운 컴포넌트 추가 시
- [ ] 디자인 토큰 사용 (하드코딩 금지)
- [ ] 반응형 고려
- [ ] 다크모드 지원 (선택)
- [ ] 접근성 속성 추가
- [ ] 일관된 네이밍 규칙

### 스타일 작성 시
- [ ] CSS 변수 사용
- [ ] 8pt 그리드 시스템 준수
- [ ] 표준 색상 팔레트 사용
- [ ] 정의된 타이포그래피 스케일 사용
- [ ] 표준 버튼 크기 사용

## 📊 일관성 규칙

### 1. 텍스트 크기
- 제목: `--text-2xl` ~ `--text-4xl`
- 부제목: `--text-lg` ~ `--text-xl`
- 본문: `--text-base` ~ `--text-md`
- 캡션: `--text-sm` ~ `--text-xs`

### 2. 간격
- 컴포넌트 내부: `--space-2` ~ `--space-4`
- 컴포넌트 간: `--space-4` ~ `--space-6`
- 섹션 간: `--space-8` ~ `--space-10`

### 3. 모서리 반경
- 버튼: `--radius-full`
- 카드: `--radius-lg` ~ `--radius-xl`
- 모달: `--radius-2xl`
- 입력 필드: `--radius-md`

### 4. 그림자
- 호버: `--shadow-md`
- 카드: `--shadow-sm` ~ `--shadow-md`
- 모달: `--shadow-xl`
- 팝업: `--shadow-lg`

## 🚫 피해야 할 것

1. **하드코딩된 값**
   ```css
   /* ❌ Bad */
   font-size: 16px;
   padding: 12px;
   
   /* ✅ Good */
   font-size: var(--text-base);
   padding: var(--space-3);
   ```

2. **일관성 없는 간격**
   ```css
   /* ❌ Bad */
   margin: 13px;
   padding: 18px;
   
   /* ✅ Good */
   margin: var(--space-3);
   padding: var(--space-4);
   ```

3. **임의의 색상**
   ```css
   /* ❌ Bad */
   color: #666;
   background: rgba(0,0,0,0.5);
   
   /* ✅ Good */
   color: var(--color-gray-600);
   background: var(--color-gray-800);
   ```

## 📱 반응형 디자인

### Breakpoints
```css
--screen-sm: 640px;   /* Mobile */
--screen-md: 768px;   /* Tablet */
--screen-lg: 1024px;  /* Desktop */
--screen-xl: 1280px;  /* Large Desktop */
```

### 반응형 규칙
- Mobile First 접근
- 터치 타겟 최소 44px
- 모바일에서 세로 스택 레이아웃
- 데스크톱에서 그리드/플렉스 레이아웃

## 🔄 마이그레이션 가이드

기존 코드를 디자인 시스템으로 마이그레이션할 때:

1. **색상 교체**
   - `#000` → `var(--color-black)`
   - `#86868B` → `var(--color-gray-400)`

2. **폰트 크기 교체**
   - `15px` → `var(--text-base)`
   - `17px` → `var(--text-md)`

3. **간격 교체**
   - `16px` → `var(--space-4)`
   - `24px` → `var(--space-6)`

4. **컴포넌트 교체**
   - 커스텀 버튼 → `<Button>` 컴포넌트
   - 인라인 스타일 텍스트 → `<Typography>` 컴포넌트

---

이 가이드를 따라 일관되고 유지보수가 쉬운 UI를 구축하세요!