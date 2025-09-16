/**
 * Timezone utility functions for consistent timezone handling across the application
 */

// Default timezone for the application (Korea)
export const DEFAULT_TIMEZONE = 'Asia/Seoul';

/**
 * Get user's timezone from various sources
 * Priority: User profile > Browser > Default
 */
export function getUserTimezone(userProfile?: { timezone?: string }): string {
  // 1. User profile timezone (if saved)
  if (userProfile?.timezone) {
    return userProfile.timezone;
  }

  // 2. Browser timezone detection
  try {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimezone) {
      return browserTimezone;
    }
  } catch (error) {
    console.warn('Failed to detect browser timezone:', error);
  }

  // 3. Default fallback
  return DEFAULT_TIMEZONE;
}

/**
 * Convert a date to user's timezone
 */
export function toUserTimezone(date: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Create a formatter for the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Parse the formatted date parts
  const parts = formatter.formatToParts(dateObj);
  const dateParts: any = {};

  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value;
    }
  });

  // Create a new date in the target timezone
  return new Date(
    `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`
  );
}

/**
 * Format date with timezone information
 */
export function formatDateWithTimezone(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
  format: 'short' | 'long' | 'iso' = 'short'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'iso':
      return dateObj.toISOString();

    case 'long':
      return new Intl.DateTimeFormat('ko-KR', {
        timeZone: timezone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }).format(dateObj);

    case 'short':
    default:
      return new Intl.DateTimeFormat('ko-KR', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj);
  }
}

/**
 * Get start of day in specific timezone
 */
export function getStartOfDay(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): Date {
  const dateInTimezone = toUserTimezone(date, timezone);
  dateInTimezone.setHours(0, 0, 0, 0);
  return dateInTimezone;
}

/**
 * Get end of day in specific timezone
 */
export function getEndOfDay(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): Date {
  const dateInTimezone = toUserTimezone(date, timezone);
  dateInTimezone.setHours(23, 59, 59, 999);
  return dateInTimezone;
}

/**
 * Check if two dates are on the same day in a specific timezone
 */
export function isSameDay(
  date1: Date | string,
  date2: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const d1 = toUserTimezone(date1, timezone);
  const d2 = toUserTimezone(date2, timezone);

  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/**
 * Get timezone offset in minutes
 */
export function getTimezoneOffset(timezone: string = DEFAULT_TIMEZONE): number {
  const now = new Date();
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get list of common timezones for user selection
 */
export function getCommonTimezones(): Array<{ value: string; label: string; offset: string }> {
  const timezones = [
    { value: 'Asia/Seoul', label: '서울', region: 'Asia' },
    { value: 'Asia/Tokyo', label: '도쿄', region: 'Asia' },
    { value: 'Asia/Shanghai', label: '상하이', region: 'Asia' },
    { value: 'Asia/Singapore', label: '싱가포르', region: 'Asia' },
    { value: 'Asia/Dubai', label: '두바이', region: 'Asia' },
    { value: 'Europe/London', label: '런던', region: 'Europe' },
    { value: 'Europe/Paris', label: '파리', region: 'Europe' },
    { value: 'Europe/Berlin', label: '베를린', region: 'Europe' },
    { value: 'America/New_York', label: '뉴욕', region: 'America' },
    { value: 'America/Los_Angeles', label: '로스앤젤레스', region: 'America' },
    { value: 'America/Chicago', label: '시카고', region: 'America' },
    { value: 'America/Toronto', label: '토론토', region: 'America' },
    { value: 'Australia/Sydney', label: '시드니', region: 'Australia' },
    { value: 'Pacific/Auckland', label: '오클랜드', region: 'Pacific' }
  ];

  return timezones.map(tz => {
    const offset = getTimezoneOffset(tz.value);
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    const offsetStr = `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    return {
      value: tz.value,
      label: `${tz.label} (${offsetStr})`,
      offset: offsetStr
    };
  });
}