// 사용자 친화적 에러 메시지 맵핑
export const getUserFriendlyErrorMessage = (error: any, locale: string = 'ko'): string => {
  const errorCode = error?.code || error?.message || '';
  
  const messages = {
    ko: {
      // 인증 관련
      'UNAUTHENTICATED': '로그인이 필요해요. 잠시만 기다려주세요.',
      'PERMISSION_DENIED': '권한이 없어요. 다시 로그인해주세요.',
      '401': '세션이 만료되었어요. 다시 로그인해주세요.',
      '403': '접근 권한이 없어요.',
      
      // 캘린더 관련
      'CALENDAR_BUSY': '캘린더가 바쁜 것 같아요. 잠시 후 다시 시도해주세요.',
      'CALENDAR_NOT_FOUND': '캘린더를 찾을 수 없어요. 설정을 확인해주세요.',
      'EVENT_NOT_FOUND': '일정을 찾을 수 없어요. 이미 삭제되었을 수 있어요.',
      'INVALID_DATE': '날짜 형식이 올바르지 않아요. (예: 내일 3시, 12월 25일)',
      'PAST_DATE': '과거 날짜는 선택할 수 없어요.',
      
      // 네트워크 관련
      'NETWORK_ERROR': '네트워크 연결을 확인해주세요.',
      'TIMEOUT': '응답 시간이 초과되었어요. 다시 시도해주세요.',
      '500': '서버에 문제가 있어요. 잠시 후 다시 시도해주세요.',
      '503': '서비스를 일시적으로 사용할 수 없어요.',
      
      // AI 관련
      'AI_PROCESSING_ERROR': '요청을 이해하지 못했어요. 다시 말씀해주세요.',
      'IMAGE_PROCESSING_ERROR': '이미지를 처리할 수 없어요. 다른 이미지를 시도해주세요.',
      'INVALID_IMAGE': '올바른 이미지 파일이 아니에요.',
      
      // 기본
      'default': '일시적인 문제가 발생했어요. 잠시 후 다시 시도해주세요.'
    },
    en: {
      // Authentication
      'UNAUTHENTICATED': 'Please log in to continue.',
      'PERMISSION_DENIED': 'You don\'t have permission. Please log in again.',
      '401': 'Your session has expired. Please log in again.',
      '403': 'Access denied.',
      
      // Calendar
      'CALENDAR_BUSY': 'Calendar is busy. Please try again later.',
      'CALENDAR_NOT_FOUND': 'Calendar not found. Please check your settings.',
      'EVENT_NOT_FOUND': 'Event not found. It may have been deleted.',
      'INVALID_DATE': 'Invalid date format. (e.g., tomorrow at 3pm, Dec 25)',
      'PAST_DATE': 'Cannot select a past date.',
      
      // Network
      'NETWORK_ERROR': 'Please check your network connection.',
      'TIMEOUT': 'Request timed out. Please try again.',
      '500': 'Server error. Please try again later.',
      '503': 'Service temporarily unavailable.',
      
      // AI
      'AI_PROCESSING_ERROR': 'Could not understand your request. Please try again.',
      'IMAGE_PROCESSING_ERROR': 'Could not process the image. Please try another one.',
      'INVALID_IMAGE': 'Invalid image file.',
      
      // Default
      'default': 'Something went wrong. Please try again later.'
    }
  };
  
  const localMessages = messages[locale as keyof typeof messages] || messages.ko;
  
  // 에러 코드로 매칭
  for (const [key, message] of Object.entries(localMessages)) {
    if (errorCode.toString().toUpperCase().includes(key)) {
      return message;
    }
  }
  
  // 특정 키워드로 매칭
  const errorString = errorCode.toString().toLowerCase();
  if (errorString.includes('auth') || errorString.includes('login')) {
    return localMessages['UNAUTHENTICATED'];
  }
  if (errorString.includes('calendar')) {
    return localMessages['CALENDAR_BUSY'];
  }
  if (errorString.includes('network') || errorString.includes('fetch')) {
    return localMessages['NETWORK_ERROR'];
  }
  if (errorString.includes('date') || errorString.includes('time')) {
    return localMessages['INVALID_DATE'];
  }
  
  return localMessages['default'];
};

// 에러 타입 체크
export const isAuthError = (error: any): boolean => {
  const errorString = error?.toString().toLowerCase() || '';
  return errorString.includes('auth') || 
         errorString.includes('401') || 
         errorString.includes('403') ||
         errorString.includes('unauthenticated');
};

export const isNetworkError = (error: any): boolean => {
  const errorString = error?.toString().toLowerCase() || '';
  return errorString.includes('network') || 
         errorString.includes('fetch') ||
         errorString.includes('timeout');
};

// 에러에 따른 추천 액션
export const getErrorSuggestions = (error: any, locale: string = 'ko'): string[] => {
  const suggestions = {
    ko: {
      auth: ['다시 로그인하기', '홈으로 돌아가기'],
      network: ['네트워크 확인하기', '다시 시도하기'],
      calendar: ['일정 새로고침', '다른 날짜 선택하기'],
      default: ['다시 시도하기', '도움말 보기']
    },
    en: {
      auth: ['Log in again', 'Go to home'],
      network: ['Check network', 'Try again'],
      calendar: ['Refresh calendar', 'Select another date'],
      default: ['Try again', 'Get help']
    }
  };
  
  const localSuggestions = suggestions[locale as keyof typeof suggestions] || suggestions.ko;
  
  if (isAuthError(error)) return localSuggestions.auth;
  if (isNetworkError(error)) return localSuggestions.network;
  if (error?.toString().includes('calendar')) return localSuggestions.calendar;
  
  return localSuggestions.default;
};