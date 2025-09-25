# 언어 변경 리다이렉트 문제 해결

## 문제 상황
"한국어모드로 전환" 명령어 실행 시:
- **시스템 응답**: "언어를 한국어로 변경합니다... 페이지를 새로고침합니다."
- **실제 결과**: 페이지가 새로고침되지 않고 영어 모드 유지

## 근본 원인

### 1. SettingsManager의 조건부 실행
```javascript
// 문제: localeChangeRef가 있으면 URL 리다이렉트 코드 실행 안 됨
if (this.localeChangeRef) {
  this.localeChangeRef(locale);  // SettingsPanel의 handleLocaleChange 호출
  return true;  // 여기서 종료!
}
// URL 리다이렉트 코드는 실행되지 않음
```

### 2. handleLocaleChange의 router.push
- Next.js router.push는 SPA 방식 네비게이션
- 실제 페이지 새로고침이 아님
- 언어 변경에는 완전한 페이지 리로드 필요

### 3. setTimeout 시간 부족
- 100ms는 너무 짧아 실행 전 취소될 가능성

## 해결 방법

### 1. source 기반 분기 처리
**파일**: `/src/services/SettingsManager.ts` (라인 218-242)

```javascript
// chat에서 호출한 경우 무조건 페이지 리로드
if (source === 'chat') {
  console.log('[SettingsManager] Chat source - forcing page reload');

  // URL 경로 계산
  const segments = currentPath.split('/').filter(Boolean);
  // ... 경로 처리 ...

  // 완전한 페이지 리로드를 위해 절대 URL 사용
  setTimeout(() => {
    const fullUrl = window.location.origin + newPath;
    window.location.replace(fullUrl);  // replace 사용으로 확실한 리로드
  }, 1000);  // 사용자가 메시지를 볼 수 있도록 1초 대기

  return true;
}

// UI에서 호출한 경우 기존 방식 사용
if (this.localeChangeRef) {
  // ...
}
```

### 2. 주요 개선사항

| 항목 | 이전 | 이후 |
|------|------|------|
| 분기 처리 | 없음 | source === 'chat' 체크 |
| 리다이렉트 방법 | window.location.pathname | window.location.replace() |
| URL 타입 | 상대 경로 | 절대 URL (origin + path) |
| 대기 시간 | 100ms | 1000ms |

### 3. AIOverlayDashboard 수정
**파일**: `/src/components/AIOverlayDashboard.tsx` (라인 690-701)

```javascript
if (settingsResponse.requiresReload) {
  // Toast 메시지만 표시 (실제 리로드는 SettingsManager에서 처리)
  toast.info(
    locale === 'ko' ? '설정 적용을 위해 새로고침합니다...' : 'Applying settings and refreshing...',
    locale === 'ko' ? '잠시만 기다려주세요' : 'Please wait a moment'
  );
}
```

## 테스트 방법

### 1. 브라우저 콘솔 테스트
```javascript
// scripts/test-language-redirect.js 실행

// 언어 변경 테스트
testLanguageRedirect('ko')  // 한국어로
testLanguageRedirect('en')  // 영어로

// 디버그 정보
debugLocale()
```

### 2. 실제 테스트 시나리오
1. 영어 모드에서 AI 오버레이 열기
2. "한국어모드로 전환" 입력
3. 확인 사항:
   - localStorage에 'ko' 저장
   - 1초 후 `/ko/` 경로로 리다이렉트
   - 페이지 완전히 새로고침
   - 한국어 UI 표시

## 동작 흐름

```
사용자 입력: "한국어모드로 전환"
↓
SettingsControlServiceV2.parseAndExecute()
↓
settingsManager.changeLocale('ko', 'chat')
↓
source === 'chat' 확인
↓
localStorage 저장 + URL 경로 계산
↓
1초 대기 (toast 메시지 표시)
↓
window.location.replace(fullUrl) 실행
↓
페이지 완전 새로고침
↓
한국어 UI 로드
```

## 핵심 개선 사항

1. ✅ **chat source 구분**: 채팅에서 호출 시 강제 리로드
2. ✅ **완전한 페이지 리로드**: window.location.replace() 사용
3. ✅ **절대 URL 사용**: origin + path로 확실한 리다이렉트
4. ✅ **충분한 대기 시간**: 1초로 늘려 사용자 피드백 제공

## 검증 완료

- localStorage 저장 ✅
- URL 경로 변경 ✅
- 페이지 새로고침 ✅
- 언어 실제 변경 ✅