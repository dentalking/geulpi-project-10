# 언어 전환 명령어 수정 요약

## 문제점
채팅창에서 "한국어모드로 전환" 또는 "영어 모드로 전환" 명령어 입력 시, 메시지는 표시되지만 실제로 언어가 전환되지 않는 문제

## 원인 분석

### 1. URL 경로 기반 언어 감지 불일치
- Next.js의 `useLocale()`는 URL 경로(`/ko/*`, `/en/*`)를 기준으로 언어 결정
- `getCurrentLocale()`이 localStorage나 UI 텍스트를 먼저 확인하여 실제 URL 상태와 불일치 가능

### 2. 리디렉션 타이밍 문제
- 1초 대기 후 리디렉션이 너무 길거나 중간에 차단될 가능성
- `window.location.replace()` 대신 `window.location.href` 사용이 더 안정적

### 3. 중복 검사 로직 문제
- URL locale과 비교하지 않고 다른 방식으로 현재 언어를 감지하여 잘못된 판단

## 수정 사항

### 1. SettingsManager.ts (`/src/services/SettingsManager.ts`)
```javascript
// 수정 전: localStorage 기반 비교
if (oldValue === locale) {
  return false;
}

// 수정 후: URL 기반 정확한 비교
const currentUrlLocale = ['ko', 'en'].includes(segments[0]) ? segments[0] : null;
if (currentUrlLocale === locale) {
  return false;
}

// 리디렉션 개선
setTimeout(() => {
  window.location.href = fullUrl; // replace → href
}, 500); // 1000ms → 500ms
```

### 2. SettingsControlServiceV2.ts (`/src/services/ai/SettingsControlServiceV2.ts`)
```javascript
// URL 기반 현재 언어 확인 추가
const urlLocale = ['ko', 'en'].includes(urlSegments[0]) ? urlSegments[0] : currentLocale;

// URL locale과 비교
if (urlLocale === locale) {
  return { message: `이미 ${lang === 'korean' ? '한국어' : '영어'}로 설정되어 있습니다.`, success: false };
}
```

## 테스트 방법

### 1. 브라우저 콘솔에서 디버깅 스크립트 실행
```javascript
// scripts/debug-language-switching.js 로드
// 현재 상태 확인
window.debugLang.checkState();

// 수동 전환 테스트
window.debugLang.changeNow("ko");  // 한국어로
window.debugLang.changeNow("en");  // 영어로
```

### 2. 채팅 명령어 테스트
- AI 채팅창에서 "한국어모드로 전환" 입력
- 콘솔에서 로그 확인
- 0.5초 후 자동 리디렉션 확인

### 3. 테스트 스크립트 실행
```javascript
// scripts/test-language-fix.js 로드
window.langTest.debug();  // 디버깅 로그 활성화
window.langTest.test();   // 자동 테스트
window.langTest.switchTo("ko");  // 수동 전환
```

## 핵심 개선 사항

1. **URL 우선 감지**: URL 경로를 최우선으로 확인하여 정확한 현재 언어 파악
2. **빠른 리디렉션**: 타임아웃을 0.5초로 단축하고 `location.href` 사용
3. **일관된 비교**: URL locale을 기준으로 일관되게 비교
4. **디버깅 강화**: 콘솔 로그로 각 단계 추적 가능

## 확인 사항

- [x] URL 경로 기반 언어 감지
- [x] localStorage 업데이트
- [x] 리디렉션 실행
- [x] 페이지 새로고침 후 언어 변경 유지

## 추가 권장 사항

1. **리디렉션 실패 처리**: 리디렉션이 실패할 경우 재시도 메커니즘 추가
2. **로딩 상태 표시**: 언어 전환 중 로딩 인디케이터 표시
3. **히스토리 관리**: 브라우저 뒤로가기 시 언어 상태 동기화