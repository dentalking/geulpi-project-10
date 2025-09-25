export function parseKoreanDateTime(text: string, timezone: string = 'Asia/Seoul'): { date: string; time: string } {
  // Get current time in the specified timezone
  const nowInTimezone = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
  const now = new Date(nowInTimezone);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 기본값
  let targetDate = now;
  let hour = 9;
  let minute = 0;

  // 날짜 파싱
  if (text.includes('내일') || text.includes('tomorrow')) {
    targetDate = tomorrow;
  } else if (text.includes('모레')) {
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 2);
  } else if (text.includes('다음주') || text.includes('next week')) {
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 7);
  }

  // 시간 파싱 - 다양한 형식 지원
  const timePatterns = [
    /(\d{1,2})\s*시\s*(\d{1,2})\s*분/,  // "2시 30분"
    /(\d{1,2})\s*시/,                   // "2시"
    /(\d{1,2}):(\d{1,2})/,              // "14:30"
    /(\d{1,2})시\s*반/,                 // "2시반"
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      hour = parseInt(match[1]);
      minute = match[2] ? parseInt(match[2]) : (text.includes('반') ? 30 : 0);
      break;
    }
  }

  // 시간 키워드 처리 (저녁, 아침 등)
  if (text.includes('저녁')) {
    // "저녁 7시"는 19시를 의미
    if (hour <= 12) hour += 12;
  } else if (text.includes('아침')) {
    // "아침 7시"는 07시를 의미
    if (hour === 12) hour = 0;
  } else if (text.includes('점심')) {
    // "점심"만 있으면 12시로 설정
    if (!timePatterns.some(p => text.match(p))) {
      hour = 12;
      minute = 0;
    }
  } else if (text.includes('오후') || text.includes('pm') || text.includes('PM')) {
    if (hour < 12) hour += 12;
  } else if (text.includes('오전') || text.includes('am') || text.includes('AM')) {
    if (hour === 12) hour = 0;
  } else if (!text.includes('새벽')) {
    // 새벽이 아니고, 특별한 시간 키워드가 없는 경우
    // 1-7시는 오후로 간주 (업무 시간 기준)
    if (hour >= 1 && hour <= 7) {
      hour += 12;
    }
  }

  // Format date in the specified timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const dateStr = formatter.format(targetDate);
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return {
    date: dateStr,
    time: timeStr
  };
}

// Get current date in KST/specified timezone as YYYY-MM-DD string
export function getCurrentDateInTimezone(timezone: string = 'Asia/Seoul'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

// Get tomorrow's date in KST/specified timezone as YYYY-MM-DD string
export function getTomorrowDateInTimezone(timezone: string = 'Asia/Seoul'): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(tomorrow);
}

// 테스트 케이스를 위한 export
export function parseTimeKeywords(text: string): number {
  // 시간만 추출하여 hour 반환 (테스트용)
  let hour = 0;
  
  const match = text.match(/(\d{1,2})\s*시/);
  if (match) {
    hour = parseInt(match[1]);
  }
  
  if (text.includes('저녁')) {
    if (hour <= 12) hour += 12;
  } else if (text.includes('아침')) {
    if (hour === 12) hour = 0;
  } else if (text.includes('오후')) {
    if (hour < 12) hour += 12;
  } else if (text.includes('오전')) {
    if (hour === 12) hour = 0;
  }
  
  return hour;
}