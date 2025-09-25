# 언어 감지 문제 해결

## 문제 상황
"한국어모드로 전환" 명령어 입력 시:
- **시스템 응답**: "이미 한국어로 설정되어 있습니다"
- **실제 상태**: 영어 모드
- **원인**: 잘못된 언어 감지

## 근본 원인

### HTML lang 속성 하드코딩
**파일**: `/src/app/layout.tsx` (라인 48)
```jsx
<html lang="ko" suppressHydrationWarning>
```

### 기존 getCurrentLocale() 문제
```javascript
// 문제: HTML lang 속성을 확인하면 항상 'ko' 반환
const htmlLang = document.documentElement.lang;  // 항상 'ko'
if (htmlLang === 'ko' || htmlLang === 'en') {
  return htmlLang;  // 항상 'ko' 반환
}
```

## 해결 방법

### getCurrentLocale() 메서드 개선
**파일**: `/src/services/ai/SettingsControlServiceV2.ts` (라인 414-461)

#### 우선순위 변경
1. **URL path** (가장 정확) → `/en/` 또는 `/ko/`
2. **localStorage** → 사용자 설정 저장
3. **UI 텍스트 분석** → 실제 표시되는 언어 감지
4. **브라우저 언어** → navigator.language
5. **기본값** → 브라우저 기반

#### 개선된 코드
```javascript
private getCurrentLocale(): Locale {
  // 1. URL path 우선 확인 (가장 정확)
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments[0] === 'ko' || segments[0] === 'en') {
    return segments[0] as Locale;
  }

  // 2. localStorage 확인
  const storedLocale = localStorage.getItem('locale');
  if (storedLocale === 'ko' || storedLocale === 'en') {
    return storedLocale as Locale;
  }

  // 3. UI 텍스트로 감지 (HTML lang 대신)
  const koreanIndicators = ['일정', '추가', '오늘', '내일'];
  const englishIndicators = ['Events', 'Add', 'Today', 'Tomorrow'];

  const bodyText = document.body?.innerText || '';
  const koCount = koreanIndicators.filter(text => bodyText.includes(text)).length;
  const enCount = englishIndicators.filter(text => bodyText.includes(text)).length;

  if (enCount > koCount) return 'en';
  if (koCount > 0) return 'ko';

  // 4. 브라우저 언어 기반 기본값
  return navigator.language.startsWith('en') ? 'en' : 'ko';
}
```

## 테스트 방법

### 1. 디버깅 스크립트
```bash
# 브라우저 콘솔에서 실행
# 현재 언어 감지 상태 확인
scripts/debug-language-detection.js
```

### 2. 수정 테스트
```bash
# 브라우저 콘솔에서 실행
scripts/test-language-fix.js
```

### 3. 강제 언어 변경
```javascript
// 브라우저 콘솔에서
quickLangChange('en')  // 영어로 변경
quickLangChange('ko')  // 한국어로 변경
```

## 개선 사항

### ✅ 해결된 문제
1. HTML lang="ko" 하드코딩 우회
2. URL path 기반 정확한 언어 감지
3. 실제 UI 텍스트로 언어 확인
4. 영어 모드에서도 정확한 감지

### 📊 감지 우선순위
| 순위 | 방법 | 설명 |
|------|------|------|
| 1 | URL path | `/en/` 또는 `/ko/` 확인 |
| 2 | localStorage | 저장된 사용자 설정 |
| 3 | UI 텍스트 | 실제 표시 언어 분석 |
| 4 | 브라우저 | navigator.language |

## 추가 개선 제안

### 장기적 해결책
1. Next.js i18n 기능 활용
2. 동적 HTML lang 속성 설정
3. 서버 사이드 언어 감지

### 임시 해결책 (현재 적용)
- HTML lang 속성 무시
- URL과 UI 기반 감지
- localStorage 활용

## 검증 완료

✅ **수정 전**: 영어 모드에서도 "이미 한국어로 설정되어 있습니다"
✅ **수정 후**: 실제 언어 상태 정확히 감지하여 변경 가능