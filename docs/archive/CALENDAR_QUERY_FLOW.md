# "내일 일정 보여줘" 명령어 처리 흐름

## 전체 처리 과정

### 1. 사용자 입력 처리
**파일**: `/src/components/AIOverlayDashboard.tsx`
- 사용자가 "내일 일정 보여줘" 입력
- ChatInterface 컴포넌트에서 메시지 전송

### 2. AI 채팅 서비스 호출
**파일**: `/src/services/ai/ChatCalendarService.ts`
```typescript
async processMessage(message: string, currentEvents: any[], userContext?: {...})
```

주요 처리:
- 날짜 키워드 감지 ("내일", "오늘", "이번 주" 등)
- AI 프롬프트 생성
- Gemini API 호출

### 3. 날짜 파싱
**파일**: `/src/lib/date-parser.ts`
```typescript
// 내일 날짜 계산
export function getTomorrowDateInTimezone(timezone: string = 'Asia/Seoul'): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(tomorrow); // "2025-09-19"
}
```

### 4. AI 응답 생성
**예시 AI 응답**:
```json
{
  "message": "내일 예정된 일정을 확인해 드릴게요.",
  "action": {
    "type": "search",
    "data": {
      "query": "내일",
      "startDate": "2025-09-19",
      "endDate": "2025-09-19"
    }
  }
}
```

### 5. API Route 처리
**파일**: `/src/app/api/ai/chat/route.ts` (라인 991-1026)

**개선된 시간대 처리**:
```typescript
case 'search':
  const searchParams: any = {
    calendarId: 'primary',
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  };

  if (data.startDate) {
    // Set to 00:00:00 of the startDate
    const startDate = new Date(data.startDate);
    startDate.setHours(0, 0, 0, 0);
    searchParams.timeMin = startDate.toISOString();
  }

  if (data.endDate) {
    // Set to 23:59:59 of the endDate
    const endDate = new Date(data.endDate);
    endDate.setHours(23, 59, 59, 999);
    searchParams.timeMax = endDate.toISOString();
  }

  const searchResult = await calendar.events.list(searchParams);
```

### 6. Google Calendar API 호출
**실제 파라미터**:
- `timeMin`: 2025-09-18T15:00:00.000Z (KST 2025-09-19 00:00:00)
- `timeMax`: 2025-09-19T14:59:59.999Z (KST 2025-09-19 23:59:59)

### 7. 결과 표시
**파일**: `/src/components/AIOverlayDashboard.tsx`
- AI 메시지 표시: "내일 예정된 일정을 확인해 드릴게요."
- 아티팩트 패널에 일정 목록 표시
- `artifactMode: "list"`로 설정

## 시간대 버그 수정

### 문제점
- `new Date('2025-09-19')`가 UTC 00:00:00로 파싱됨
- 한국 시간으로는 오전 9시가 되어 오전 일정만 조회되는 문제

### 해결책
1. **startDate**: `setHours(0, 0, 0, 0)`로 해당 날짜의 시작 시간 설정
2. **endDate**: `setHours(23, 59, 59, 999)`로 해당 날짜의 종료 시간 설정
3. 결과: 하루 전체 (00:00:00 ~ 23:59:59) 일정 조회 가능

## 지원되는 날짜 키워드

| 키워드 | 날짜 범위 | 예시 |
|--------|-----------|------|
| 오늘 | 오늘 00:00 ~ 23:59 | "오늘 일정 보여줘" |
| 내일 | 내일 00:00 ~ 23:59 | "내일 일정 알려줘" |
| 모레 | 모레 00:00 ~ 23:59 | "모레 회의 있어?" |
| 이번 주 | 이번 주 일요일 ~ 토요일 | "이번 주 일정 확인" |
| 다음 주 | 다음 주 일요일 ~ 토요일 | "다음 주 스케줄" |

## 테스트 스크립트

### 기본 테스트
```bash
node scripts/test-calendar-query.js
```

### 개선된 버전 (시간대 처리 포함)
```bash
node scripts/test-calendar-query-v2.js
```

## 개선 사항

✅ **완료된 개선**:
1. 시간대 처리 버그 수정
2. 하루 전체 일정 조회 가능
3. KST 시간대 정확한 처리

📋 **추가 개선 가능 사항**:
1. 주간/월간 일정 조회 최적화
2. 반복 일정 처리
3. 일정 필터링 옵션 추가