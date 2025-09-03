/**
 * Google Calendar URL 생성 유틸리티
 */

interface GoogleCalendarUrlOptions {
  view?: 'day' | 'week' | 'month' | 'year' | 'agenda';
  date?: Date;
  eventId?: string;
  calendarId?: string;
}

/**
 * Google Calendar 웹 URL 생성
 */
export function getGoogleCalendarUrl(options: GoogleCalendarUrlOptions = {}): string {
  const baseUrl = 'https://calendar.google.com/calendar';
  const { view = 'month', date, eventId, calendarId = 'primary' } = options;
  
  // 특정 이벤트 편집 URL
  if (eventId) {
    return `${baseUrl}/u/0/r/eventedit/${eventId}`;
  }
  
  // 날짜 기반 URL 생성
  if (date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 0-indexed를 1-indexed로
    const day = date.getDate();
    
    switch (view) {
      case 'day':
        return `${baseUrl}/u/0/r/day/${year}/${month}/${day}`;
      case 'week':
        return `${baseUrl}/u/0/r/week/${year}/${month}/${day}`;
      case 'month':
        return `${baseUrl}/u/0/r/month/${year}/${month}/1`;
      case 'year':
        return `${baseUrl}/u/0/r/year/${year}`;
      case 'agenda':
        return `${baseUrl}/u/0/r/agenda/${year}/${month}/${day}`;
      default:
        return `${baseUrl}/u/0/r`;
    }
  }
  
  // 기본 캘린더 URL
  return `${baseUrl}/u/0/r`;
}

/**
 * 새 이벤트 생성 URL 생성
 */
export function getGoogleCalendarCreateEventUrl(params: {
  title?: string;
  dates?: { start: Date; end: Date };
  details?: string;
  location?: string;
  guests?: string[]; // 이메일 배열
}): string {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const queryParams = new URLSearchParams();
  
  queryParams.set('action', 'TEMPLATE');
  
  if (params.title) {
    queryParams.set('text', params.title);
  }
  
  if (params.dates) {
    // Google Calendar는 YYYYMMDDTHHmmssZ 형식을 사용
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };
    
    queryParams.set('dates', `${formatDate(params.dates.start)}/${formatDate(params.dates.end)}`);
  }
  
  if (params.details) {
    queryParams.set('details', params.details);
  }
  
  if (params.location) {
    queryParams.set('location', params.location);
  }
  
  if (params.guests && params.guests.length > 0) {
    queryParams.set('add', params.guests.join(','));
  }
  
  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * 모바일 Google Calendar 앱 URL 생성 (딥링크)
 */
export function getGoogleCalendarDeepLink(eventId?: string): string {
  if (eventId) {
    // 모바일 앱에서 특정 이벤트 열기
    return `googlecalendar://event?eid=${eventId}`;
  }
  // 모바일 앱 열기
  return 'googlecalendar://';
}

/**
 * 사용자 에이전트 기반 최적 URL 선택
 */
export function getOptimalCalendarUrl(
  options: GoogleCalendarUrlOptions = {},
  isMobile: boolean = false
): string {
  if (isMobile && options.eventId) {
    // 모바일에서는 딥링크 시도, 실패 시 웹 URL로 폴백
    return getGoogleCalendarDeepLink(options.eventId);
  }
  
  return getGoogleCalendarUrl(options);
}

/**
 * 이벤트 ID에서 Google Calendar 이벤트 ID 추출
 * (Google Calendar API에서 반환된 ID 형식 처리)
 */
export function extractEventId(fullEventId: string): string {
  // Google Calendar 이벤트 ID는 때때로 '_' 문자를 포함
  // 예: "abc123_20240115T100000Z"
  const parts = fullEventId.split('_');
  return parts[0];
}

/**
 * 캘린더 공유 URL 생성
 */
export function getCalendarShareUrl(calendarId: string = 'primary'): string {
  if (calendarId === 'primary') {
    // 기본 캘린더는 이메일 주소 필요
    return 'https://calendar.google.com/calendar/u/0/r/settings/calendar';
  }
  
  return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}`;
}