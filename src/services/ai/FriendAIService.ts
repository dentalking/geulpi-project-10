import { logger } from '@/lib/logger';

export interface FriendAction {
  type: 'list' | 'add' | 'remove' | 'accept' | 'reject' | 'share_event' | 'schedule_meeting' | 'view_requests';
  data?: any;
}

export interface FriendAIResponse {
  message: string;
  action?: FriendAction;
  friends?: any[];
  requests?: any[];
  success: boolean;
}

export class FriendAIService {
  private locale: string;

  constructor(locale: string = 'ko') {
    this.locale = locale;
  }

  /**
   * Parse friend-related commands from user input
   */
  async parseCommand(text: string): Promise<FriendAction | null> {
    const lowerText = text.toLowerCase();

    // Extract email from text first
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const emailMatch = text.match(emailRegex);

    // Korean patterns - more flexible
    const koreanPatterns = {
      list: /친구\s*(목록|리스트|보여|확인)/,
      add: /(친구\s*(추가|등록|요청)|친구추가|친구등록)/i,
      remove: /(친구\s*(삭제|제거|끊|취소)|연결\s*끊).*?(.+)/,
      accept: /친구\s*요청\s*(수락|승인|받|허용)/,
      reject: /친구\s*요청\s*(거절|거부|취소|안받)/,
      viewRequests: /친구\s*요청\s*(보여|확인|목록)/,
      shareEvent: /(일정|이벤트|약속).*?(공유|나눠|보내).*?(.+)/,
      scheduleMeeting: /(.+)(와|이랑|하고)\s*(미팅|약속|일정).*?(잡|만들|생성)/,
    };

    // English patterns - more flexible to handle various word orders
    const englishPatterns = {
      list: /^(show|list|view).*friends$|^my friends$|^friends list$/i,
      add: /add.*to.*friend|add.*friend|friend.*request|add.*account|add.*user/i,
      remove: /remove.*friend|unfriend|disconnect.*(.+)/,
      accept: /accept.*friend.*request/,
      reject: /reject.*friend.*request|decline.*friend/,
      viewRequests: /show.*friend.*requests|pending.*friends/,
      shareEvent: /share.*event.*with.*(.+)/,
      scheduleMeeting: /schedule.*meeting.*with.*(.+)|meet.*with.*(.+)/,
    };

    // Check both Korean and English patterns regardless of locale
    // This allows users to use Korean commands even in English mode
    const checkPattern = (pattern: RegExp) => {
      return koreanPatterns[pattern as keyof typeof koreanPatterns]?.test(lowerText) ||
             englishPatterns[pattern as keyof typeof englishPatterns]?.test(lowerText);
    };

    // Check for add command FIRST (before list) and use the extracted email
    if ((koreanPatterns.add.test(lowerText) || englishPatterns.add.test(lowerText)) && emailMatch) {
      return {
        type: 'add',
        data: { email: emailMatch[0] }
      };
    }

    // Check patterns
    if (koreanPatterns.list.test(lowerText) || englishPatterns.list.test(lowerText)) {
      return { type: 'list' };
    }

    if (koreanPatterns.viewRequests.test(lowerText) || englishPatterns.viewRequests.test(lowerText)) {
      return { type: 'view_requests' };
    }

    const removeMatchKo = lowerText.match(koreanPatterns.remove);
    const removeMatchEn = lowerText.match(englishPatterns.remove);
    const removeMatch = removeMatchKo || removeMatchEn;
    if (removeMatch) {
      const friendName = removeMatch[3] || removeMatch[1];
      return {
        type: 'remove',
        data: { friendName: friendName?.trim() }
      };
    }

    if (koreanPatterns.accept.test(lowerText) || englishPatterns.accept.test(lowerText)) {
      return { type: 'accept' };
    }

    if (koreanPatterns.reject.test(lowerText) || englishPatterns.reject.test(lowerText)) {
      return { type: 'reject' };
    }

    const shareMatchKo = lowerText.match(koreanPatterns.shareEvent);
    const shareMatchEn = lowerText.match(englishPatterns.shareEvent);
    const shareMatch = shareMatchKo || shareMatchEn;
    if (shareMatch) {
      const friendName = shareMatch[3] || shareMatch[1];
      return {
        type: 'share_event',
        data: { friendName: friendName?.trim() }
      };
    }

    const meetingMatchKo = lowerText.match(koreanPatterns.scheduleMeeting);
    const meetingMatchEn = lowerText.match(englishPatterns.scheduleMeeting);
    const meetingMatch = meetingMatchKo || meetingMatchEn;
    if (meetingMatch) {
      const friendName = meetingMatch[1] || meetingMatch[2] || meetingMatch[3];
      // Extract time if present
      const timeMatch = text.match(/(\d{1,2})(시|:)(\d{0,2})?/);
      const dateMatch = text.match(/(내일|오늘|모레|다음\s*주|tomorrow|today)/);

      return {
        type: 'schedule_meeting',
        data: {
          friendName: friendName?.trim(),
          time: timeMatch ? timeMatch[0] : null,
          date: dateMatch ? dateMatch[0] : null
        }
      };
    }

    return null;
  }

  /**
   * Generate response message based on action result
   */
  generateResponse(action: FriendAction, result: any): string {
    const messages = {
      ko: {
        list_success: `친구 목록입니다:\n${result.friends?.map((f: any) => `• ${f.name || f.email}`).join('\n') || '아직 친구가 없습니다.'}`,
        list_error: '친구 목록을 불러올 수 없습니다.',
        add_success: `${result.email}님에게 친구 요청을 보냈습니다.`,
        add_error: '친구 요청을 보낼 수 없습니다.',
        remove_success: `${result.friendName}님과의 친구 관계를 해제했습니다.`,
        remove_error: '친구 삭제에 실패했습니다.',
        accept_success: '친구 요청을 수락했습니다.',
        accept_error: '친구 요청 수락에 실패했습니다.',
        reject_success: '친구 요청을 거절했습니다.',
        reject_error: '친구 요청 거절에 실패했습니다.',
        view_requests_success: `받은 친구 요청:\n${result.requests?.map((r: any) => `• ${r.requester_name || r.requester_email}`).join('\n') || '대기 중인 요청이 없습니다.'}`,
        view_requests_error: '친구 요청을 확인할 수 없습니다.',
        share_event_success: `일정을 ${result.friendName}님과 공유했습니다.`,
        share_event_error: '일정 공유에 실패했습니다.',
        schedule_meeting_success: `${result.friendName}님과의 미팅을 생성했습니다.`,
        schedule_meeting_error: '미팅 생성에 실패했습니다.'
      },
      en: {
        list_success: `Your friends:\n${result.friends?.map((f: any) => `• ${f.name || f.email}`).join('\n') || 'No friends yet.'}`,
        list_error: 'Could not load friends list.',
        add_success: `Friend request sent to ${result.email}.`,
        add_error: 'Failed to send friend request.',
        remove_success: `Removed ${result.friendName} from friends.`,
        remove_error: 'Failed to remove friend.',
        accept_success: 'Friend request accepted.',
        accept_error: 'Failed to accept friend request.',
        reject_success: 'Friend request rejected.',
        reject_error: 'Failed to reject friend request.',
        view_requests_success: `Friend requests:\n${result.requests?.map((r: any) => `• ${r.requester_name || r.requester_email}`).join('\n') || 'No pending requests.'}`,
        view_requests_error: 'Could not load friend requests.',
        share_event_success: `Event shared with ${result.friendName}.`,
        share_event_error: 'Failed to share event.',
        schedule_meeting_success: `Meeting scheduled with ${result.friendName}.`,
        schedule_meeting_error: 'Failed to schedule meeting.'
      }
    };

    const msg = messages[this.locale as 'ko' | 'en'] || messages.ko;
    const key = `${action.type}_${result.success ? 'success' : 'error'}` as keyof typeof msg;

    return msg[key] || msg.list_error;
  }

  /**
   * Generate smart suggestions for friend operations
   */
  generateSuggestions(): string[] {
    if (this.locale === 'ko') {
      return [
        '친구 목록 보여줘',
        '친구 요청 확인해줘',
        '김철수와 내일 저녁 7시 약속 잡아줘',
        '이 일정을 박영희와 공유해줘'
      ];
    }

    return [
      'Show my friends',
      'Check friend requests',
      'Schedule meeting with John tomorrow at 7pm',
      'Share this event with Sarah'
    ];
  }
}