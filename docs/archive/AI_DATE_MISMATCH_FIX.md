# AI 날짜 불일치 문제 수정

## 문제 상황
"내일 일정 보여줘" 명령어 테스트 시:
- **AI 응답**: 9월 19일 1:00 PM에 "경희대학교치과병원 학술대회" 있다고 응답
- **실제 캘린더**: 0 events (비어있음)
- **원인**: AI가 9월 20일 일정을 9월 19일로 잘못 말함

## 근본 원인 분석

### 1. 프롬프트 날짜 문제
**이전 코드** (`ChatCalendarService.ts`):
```javascript
// 템플릿 리터럴이 문자열로 전달됨
{"type":"search","data":{"query":"내일","startDate":"${getTomorrowDateInTimezone('Asia/Seoul')}","endDate":"${getTomorrowDateInTimezone('Asia/Seoul')}"}}
```

### 2. 고정된 날짜 예시
```javascript
// 잘못된 예시 날짜들
{"type":"create","data":{"title":"회의","date":"2024-01-11","time":"15:00"}}
```

### 3. AI가 실제 날짜를 모름
- 현재 시간만 전달하고 구체적인 날짜 정보 부족
- AI가 임의로 날짜를 생성하거나 잘못 계산

## 해결 방법

### 1. 프롬프트에 실제 날짜 추가
```javascript
// 오늘과 내일 날짜 미리 계산
const todayDate = getCurrentDateInTimezone(userContext?.timezone || 'Asia/Seoul');
const tomorrowDate = getTomorrowDateInTimezone(userContext?.timezone || 'Asia/Seoul');

const prompt = `
현재 시간: ${currentDateTime}
오늘 날짜: ${todayDate}
내일 날짜: ${tomorrowDate}
...
```

### 2. AI에게 명확한 지시
```javascript
중요: 날짜를 지정할 때 반드시 위에 제공된 '오늘 날짜: ${todayDate}' 와 '내일 날짜: ${tomorrowDate}'를 사용하세요.
절대 다른 날짜를 만들어내지 마세요.
```

### 3. 예시 날짜 동적 생성
```javascript
// 이전
{"type":"search","data":{"query":"내일","startDate":"2024-01-11","endDate":"2024-01-11"}}

// 이후
{"type":"search","data":{"query":"내일","startDate":"${tomorrowDate}","endDate":"${tomorrowDate}"}}
```

## 수정된 파일

### `/src/services/ai/ChatCalendarService.ts`
- 라인 188-190: 날짜 계산 추가
- 라인 196-197: 프롬프트에 오늘/내일 날짜 추가
- 라인 242-243: AI에게 날짜 사용 지시
- 라인 245-325: 예시들의 고정 날짜를 동적 날짜로 변경

### `/src/app/api/ai/chat/route.ts` (기존 수정)
- 라인 1012-1015: startDate를 00:00:00으로 설정
- 라인 1017-1022: endDate를 23:59:59로 설정

## 테스트 방법

### 1. 테스트 스크립트 실행
```bash
# AI 날짜 처리 테스트
node scripts/test-ai-date-fix.js

# 캘린더 쿼리 테스트
node scripts/test-calendar-query-v2.js
```

### 2. 실제 테스트
1. 개발 서버 실행: `npm run dev`
2. AI 오버레이 열기
3. "내일 일정 보여줘" 입력
4. 확인 사항:
   - AI가 정확한 내일 날짜(9월 19일) 언급
   - 실제 캘린더 API도 같은 날짜 조회
   - 일정이 있으면 정확히 표시, 없으면 "0 events"

## 예상 결과

### 수정 전
```
사용자: "내일 일정 보여줘"
AI: "9월 19일에 학술대회가 있습니다" (잘못된 정보)
캘린더: 0 events (실제로는 9월 19일에 일정 없음)
```

### 수정 후
```
사용자: "내일 일정 보여줘"
AI: "내일(9월 19일) 예정된 일정을 확인해 드릴게요"
캘린더: 실제 9월 19일 일정 표시 (있으면 표시, 없으면 0 events)
```

## 핵심 개선 사항

1. ✅ AI가 실제 날짜 정확히 인식
2. ✅ 프롬프트에 오늘/내일 날짜 명시적 전달
3. ✅ 고정된 날짜 예시 제거
4. ✅ AI와 실제 캘린더 API 결과 일치
5. ✅ 시간대 처리 정확성 (KST 기준)

## 참고 사항

- AI는 이제 절대 임의의 날짜를 생성하지 않음
- 모든 날짜는 프롬프트에서 제공된 값만 사용
- 시간대는 Asia/Seoul (KST) 기준으로 통일