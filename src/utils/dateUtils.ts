/**
 * Unified date utilities for consistent timezone handling
 * Ensures server and client use the same date logic
 */

/**
 * Get user's timezone with fallback
 */
export function getUserTimezone(): string {
  // Priority: Browser timezone > Default (Asia/Seoul)
  if (typeof window !== 'undefined') {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'Asia/Seoul';
    }
  }
  return 'Asia/Seoul';
}

/**
 * Get today's date in specified timezone
 * Returns date at 00:00:00 in the timezone
 */
export function getTodayInTimezone(timezone?: string): Date {
  const tz = timezone || getUserTimezone();
  const now = new Date();

  // Get the current date in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const dateParts: { [key: string]: string } = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value;
    }
  }

  // Create date at midnight in the target timezone
  const today = new Date(
    parseInt(dateParts.year),
    parseInt(dateParts.month) - 1,
    parseInt(dateParts.day),
    0, 0, 0, 0
  );

  return today;
}

/**
 * Get tomorrow's date in specified timezone
 */
export function getTomorrowInTimezone(timezone?: string): Date {
  const today = getTodayInTimezone(timezone);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * Get date string in YYYY-MM-DD format for timezone
 */
export function getDateString(date: Date, timezone?: string): string {
  const tz = timezone || getUserTimezone();
  return date.toLocaleDateString('en-CA', { timeZone: tz });
}

/**
 * Parse event date consistently
 * Handles both all-day events (date) and timed events (dateTime)
 */
export function parseEventDate(event: {
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}): { start: Date; end: Date; isAllDay: boolean } {
  let start: Date;
  let end: Date;
  let isAllDay = false;

  // Handle start date
  if (event.start?.date && !event.start?.dateTime) {
    // All-day event - parse as local date at midnight
    const [year, month, day] = event.start.date.split('-').map(Number);
    start = new Date(year, month - 1, day, 0, 0, 0, 0);
    isAllDay = true;
  } else if (event.start?.dateTime) {
    // Timed event - parse ISO string
    start = new Date(event.start.dateTime);
  } else {
    // Fallback to current time
    start = new Date();
  }

  // Handle end date
  if (event.end?.date && !event.end?.dateTime) {
    // All-day event end
    const [year, month, day] = event.end.date.split('-').map(Number);
    end = new Date(year, month - 1, day, 0, 0, 0, 0);
  } else if (event.end?.dateTime) {
    // Timed event end
    end = new Date(event.end.dateTime);
  } else {
    // Default to 1 hour after start
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }

  return { start, end, isAllDay };
}

/**
 * Check if event is on a specific date
 * Considers timezone and all-day events
 */
export function isEventOnDate(
  event: { start?: { date?: string; dateTime?: string } },
  targetDate: Date,
  timezone?: string
): boolean {
  const { start, isAllDay } = parseEventDate(event);
  const tz = timezone || getUserTimezone();

  // Get date boundaries in timezone
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // For all-day events, check if the date matches
  if (isAllDay) {
    const eventDateStr = getDateString(start, tz);
    const targetDateStr = getDateString(targetDate, tz);
    return eventDateStr === targetDateStr;
  }

  // For timed events, check if within the day
  return start >= dayStart && start < dayEnd;
}

/**
 * Check if event is in date range
 * Handles timezone-aware boundaries correctly
 */
export function isEventInRange(
  event: {
    start?: { date?: string; dateTime?: string };
    end?: { date?: string; dateTime?: string }
  },
  rangeStart: Date,
  rangeEnd: Date,
  timezone?: string
): boolean {
  const { start, end, isAllDay } = parseEventDate(event);
  const tz = timezone || getUserTimezone();

  // For all-day events, compare dates in the specified timezone
  if (isAllDay) {
    const eventStartStr = getDateString(start, tz);
    const eventEndStr = getDateString(end, tz);
    const rangeStartStr = getDateString(rangeStart, tz);
    const rangeEndStr = getDateString(rangeEnd, tz);

    // Check if event overlaps with the range
    return eventStartStr <= rangeEndStr && eventEndStr >= rangeStartStr;
  }

  // For timed events, use the range boundaries as-is
  // getDateRangeForQuery already provides correct day boundaries
  return start < rangeEnd && end > rangeStart;
}

/**
 * Get "today", "tomorrow", "this week", etc. date ranges
 */
export function getDateRangeForQuery(
  query: string,
  timezone?: string
): { start: Date; end: Date; label: string } | null {
  const tz = timezone || getUserTimezone();
  const today = getTodayInTimezone(tz);

  const lowerQuery = query.toLowerCase();

  // Check for specific date patterns (e.g., "9/28일", "9월 28일", "9-28")
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})일?/,  // 9/28, 9-28, 9/28일
    /(\d{1,2})월\s*(\d{1,2})일?/     // 9월 28일
  ];

  for (const pattern of datePatterns) {
    const match = query.match(pattern);
    if (match) {
      const month = parseInt(match[1], 10);
      const day = parseInt(match[2], 10);
      const year = today.getFullYear();

      // Create date for the specific day
      const targetDate = new Date(year, month - 1, day, 0, 0, 0, 0);

      // If the date is in the past, try next year
      if (targetDate < today) {
        targetDate.setFullYear(year + 1);
      }

      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      return {
        start: targetDate,
        end: nextDay,
        label: `${month}월 ${day}일`
      };
    }
  }

  if (lowerQuery.includes('오늘') || lowerQuery.includes('today')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      start: today,
      end: tomorrow,
      label: '오늘'
    };
  }

  if (lowerQuery.includes('내일') || lowerQuery.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    return {
      start: tomorrow,
      end: dayAfter,
      label: '내일'
    };
  }

  if (lowerQuery.includes('어제') || lowerQuery.includes('yesterday')) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      start: yesterday,
      end: today,
      label: '어제'
    };
  }

  if (lowerQuery.includes('이번주') || lowerQuery.includes('이번 주') || lowerQuery.includes('this week')) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return {
      start: weekStart,
      end: weekEnd,
      label: '이번 주'
    };
  }

  if (lowerQuery.includes('다음주') || lowerQuery.includes('다음 주') || lowerQuery.includes('next week')) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 7); // Next Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return {
      start: weekStart,
      end: weekEnd,
      label: '다음 주'
    };
  }

  if (lowerQuery.includes('이번달') || lowerQuery.includes('이번 달') || lowerQuery.includes('this month')) {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    return {
      start: monthStart,
      end: monthEnd,
      label: '이번 달'
    };
  }

  if (lowerQuery.includes('다음달') || lowerQuery.includes('다음 달') || lowerQuery.includes('next month')) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    monthEnd.setHours(23, 59, 59, 999);
    return {
      start: monthStart,
      end: monthEnd,
      label: '다음 달'
    };
  }

  return null;
}

/**
 * Format date for display
 */
export function formatEventDate(
  event: { start?: { date?: string; dateTime?: string } },
  locale: 'ko' | 'en' = 'ko',
  timezone?: string
): string {
  const { start, isAllDay } = parseEventDate(event);
  const tz = timezone || getUserTimezone();

  if (isAllDay) {
    return start.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: tz
    });
  }

  return start.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz
  });
}

/**
 * Get relative time description
 */
export function getRelativeTime(date: Date, locale: 'ko' | 'en' = 'ko'): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
  const minutes = Math.floor(Math.abs(diff) / (1000 * 60));

  if (locale === 'ko') {
    if (days === 0) {
      if (hours === 0) {
        if (minutes === 0) return '지금';
        return minutes > 0 ? `${minutes}분 후` : `${Math.abs(minutes)}분 전`;
      }
      return hours > 0 ? `${hours}시간 후` : `${Math.abs(hours)}시간 전`;
    }
    if (days === 1) return '내일';
    if (days === -1) return '어제';
    if (days > 0) return `${days}일 후`;
    return `${Math.abs(days)}일 전`;
  } else {
    if (days === 0) {
      if (hours === 0) {
        if (minutes === 0) return 'now';
        return minutes > 0 ? `in ${minutes} minutes` : `${Math.abs(minutes)} minutes ago`;
      }
      return hours > 0 ? `in ${hours} hours` : `${Math.abs(hours)} hours ago`;
    }
    if (days === 1) return 'tomorrow';
    if (days === -1) return 'yesterday';
    if (days > 0) return `in ${days} days`;
    return `${Math.abs(days)} days ago`;
  }
}