# 언어 변경 명령어 수정 완료

## 문제점
"한국어모드로 변경"과 같은 언어 변경 명령어가 작동하지 않음

## 해결 방법

### 1. 패턴 매칭 개선 (`SettingsControlServiceV2.ts`)
```typescript
// 이전: 단순 패턴
/한국어/i

// 이후: 구체적인 패턴들
/한국어.*모드/i,
/한국어.*변경/i,
/한국어.*전환/i,
/한국어로/i,
/한국어/i,
/한글.*모드/i,
// ...
```

### 2. 현재 언어 감지 로직 개선
```typescript
private getCurrentLocale(): Locale {
  // 1. localStorage 우선 확인
  const storedLocale = localStorage.getItem('locale');

  // 2. URL path 확인
  // 3. HTML lang 속성
  // 4. 브라우저 언어 설정
  // 5. 기본값
}
```

### 3. 언어 변경 처리 개선 (`SettingsManager.ts`)
- localStorage에 언어 설정 저장
- 디버그 로그 추가
- URL 리다이렉트 로직 개선

## 지원되는 명령어

### 한국어 전환
- "한국어모드로 변경"
- "한국어 모드로 변경해줘"
- "한국어로 바꿔줘"
- "한글로 설정"
- "한국어로 전환"

### 영어 전환
- "영어모드로 변경"
- "영어 모드로 전환"
- "영어로 바꿔줘"
- "English mode"

## 테스트 방법

### 1. 브라우저 콘솔에서 패턴 테스트
```javascript
// scripts/test-language-change.js 실행
testLanguageCommand("한국어모드로 변경");
```

### 2. 현재 언어 확인
```javascript
checkCurrentLanguage();
```

### 3. 실제 채팅 테스트
1. AI 오버레이 열기
2. "한국어모드로 변경" 입력
3. 페이지가 새로고침되며 언어 변경 확인

## 동작 흐름

1. **패턴 매칭**: 사용자 입력이 언어 변경 패턴과 일치하는지 확인
2. **현재 언어 감지**: localStorage, URL, HTML lang 등 확인
3. **중복 체크**: 이미 해당 언어인지 확인
4. **언어 변경**:
   - localStorage 업데이트
   - URL 경로 변경
   - 페이지 리로드

## 주의사항

- 언어 변경 시 페이지가 새로고침됩니다
- localStorage에 `locale` 키로 저장됩니다
- URL 경로가 `/ko/` 또는 `/en/`으로 변경됩니다

## 디버깅

콘솔에서 다음 로그 확인:
- `[SettingsControlServiceV2] Language change detected`
- `[getCurrentLocale] Found in...`
- `[SettingsManager] changeLocale called`
- `[SettingsManager] Redirecting to...`