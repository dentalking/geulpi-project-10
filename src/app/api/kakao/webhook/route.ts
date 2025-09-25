import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  env.get('NEXT_PUBLIC_SUPABASE_URL')!,
  env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// 카카오톡 메시지 타입
interface KakaoMessage {
  user_key: string;
  type: 'text' | 'photo' | 'button';
  content: string;
}

// 카카오톡 응답 형식
interface KakaoResponse {
  message: {
    text: string;
    photo?: {
      url: string;
      width: number;
      height: number;
    };
    message_button?: {
      label: string;
      url: string;
    };
  };
  keyboard?: {
    type: 'buttons' | 'text';
    buttons?: string[];
  };
}

// 서명 검증 (보안)
function verifySignature(body: string, signature: string): boolean {
  const botSecret = env.get('KAKAO_BOT_SECRET');
  if (!botSecret) return false;

  const hash = crypto
    .createHmac('sha256', botSecret)
    .update(body)
    .digest('base64');

  return hash === signature;
}

// POST: 카카오톡 메시지 수신
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get('X-KakaoTalk-Signature');

    // 서명 검증 (프로덕션에서 필수)
    if (env.isProduction() && signature) {
      if (!verifySignature(bodyText, signature)) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const body: KakaoMessage = JSON.parse(bodyText);
    const { user_key, type, content } = body;

    logger.debug(`[Kakao Bot] Received: ${type} - ${content} from ${user_key}`);

    // 사용자 정보 조회 또는 생성
    const userInfo = await getOrCreateKakaoUser(user_key);

    // 메시지 타입별 처리
    let response: KakaoResponse;

    switch (type) {
      case 'text':
        response = await handleTextMessage(content, userInfo);
        break;
      case 'photo':
        response = await handlePhotoMessage(content, userInfo);
        break;
      case 'button':
        response = await handleButtonMessage(content, userInfo);
        break;
      default:
        response = createDefaultResponse();
    }

    return NextResponse.json(response);

  } catch (error) {
    logger.error('[Kakao Bot] Error:', error);
    return NextResponse.json(createErrorResponse());
  }
}

// 카카오 사용자 조회/생성
async function getOrCreateKakaoUser(kakaoUserId: string) {
  // messenger_integrations 테이블에서 조회
  const { data: integration } = await supabase
    .from('messenger_integrations')
    .select('*')
    .eq('platform', 'kakao')
    .eq('platform_user_id', kakaoUserId)
    .single();

  if (integration) {
    // 기존 사용자
    return {
      userId: integration.user_id,
      isRegistered: !!integration.user_id,
      preferences: integration.preferences || {}
    };
  } else {
    // 신규 사용자 - 임시 등록
    const { data: newIntegration } = await supabase
      .from('messenger_integrations')
      .insert({
        platform: 'kakao',
        platform_user_id: kakaoUserId,
        preferences: {
          notifications: true,
          language: 'ko'
        }
      })
      .select()
      .single();

    return {
      userId: null,
      isRegistered: false,
      preferences: newIntegration?.preferences || {}
    };
  }
}

// 텍스트 메시지 처리
async function handleTextMessage(
  content: string,
  userInfo: any
): Promise<KakaoResponse> {
  const lowerContent = content.toLowerCase();

  // 인사말
  if (lowerContent.includes('안녕') || lowerContent.includes('hello')) {
    return {
      message: {
        text: `안녕하세요! 👋\n저는 글피 캘린더 봇입니다.\n\n어떤 도움이 필요하신가요?`
      },
      keyboard: {
        type: 'buttons',
        buttons: [
          '📅 오늘 일정 보기',
          '➕ 새 일정 추가',
          '👥 친구와 약속 잡기',
          '🔗 서비스 연결하기',
          'ℹ️ 도움말'
        ]
      }
    };
  }

  // 오늘 일정 보기
  if (lowerContent.includes('오늘') && lowerContent.includes('일정')) {
    if (!userInfo.isRegistered) {
      return createRegistrationPrompt();
    }

    const events = await getTodayEvents(userInfo.userId);
    return createEventsResponse(events);
  }

  // 친구와 약속
  if (lowerContent.includes('친구') && lowerContent.includes('약속')) {
    return {
      message: {
        text: '친구와 약속을 잡으려면 다음 정보를 알려주세요:\n\n' +
          '예) "김철수와 내일 오후 3시 카페에서 만나기"\n\n' +
          '친구 이름, 날짜, 시간, 장소를 포함해주세요.'
      }
    };
  }

  // 약속 제안 패턴 감지 (더 유연한 패턴)
  const appointmentPattern = /(.+?)와\s+(.+?)\s+(오전|오후)?\s?(\d+시)\s+(.+?)(?:에서|에)\s+만나/;
  const match = content.match(appointmentPattern);

  if (match) {
    const [_, friendName, date, period, hour, location] = match;
    const time = period ? `${period} ${hour}` : hour;
    return await createAppointmentProposal({
      friendName,
      date,
      time,
      location,
      proposerId: userInfo.userId
    });
  }

  // 서비스 연결
  if (lowerContent.includes('연결') || lowerContent.includes('가입')) {
    return createRegistrationPrompt();
  }

  // 도움말
  if (lowerContent.includes('도움') || lowerContent.includes('help')) {
    return createHelpResponse();
  }

  // 기본 응답
  return {
    message: {
      text: '무엇을 도와드릴까요? 아래 버튼을 선택하거나 자유롭게 말씀해주세요.'
    },
    keyboard: {
      type: 'buttons',
      buttons: [
        '📅 오늘 일정 보기',
        '➕ 새 일정 추가',
        '👥 친구와 약속 잡기',
        'ℹ️ 도움말'
      ]
    }
  };
}

// 사진 메시지 처리
async function handlePhotoMessage(
  content: string,
  userInfo: any
): Promise<KakaoResponse> {
  // 이미지 URL이 content로 전달됨
  return {
    message: {
      text: '📸 사진을 받았습니다!\n\n' +
        '사진에서 일정 정보를 추출하는 기능은 준비 중입니다.\n' +
        '텍스트로 일정을 알려주시면 등록해드릴게요.'
    }
  };
}

// 버튼 메시지 처리
async function handleButtonMessage(
  content: string,
  userInfo: any
): Promise<KakaoResponse> {
  // 버튼 선택에 따른 처리
  return handleTextMessage(content, userInfo);
}

// 오늘 일정 조회
async function getTodayEvents(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
    .order('start_time');

  return events || [];
}

// 일정 응답 생성
function createEventsResponse(events: any[]): KakaoResponse {
  if (events.length === 0) {
    return {
      message: {
        text: '오늘은 등록된 일정이 없습니다. 😊\n새로운 일정을 추가하시겠어요?'
      },
      keyboard: {
        type: 'buttons',
        buttons: ['➕ 새 일정 추가', '🏠 메인 메뉴']
      }
    };
  }

  let text = `📅 오늘의 일정 (${events.length}개)\n\n`;

  events.forEach((event, index) => {
    const startTime = new Date(event.start_time);
    const timeStr = startTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    text += `${index + 1}. ${timeStr} - ${event.summary}\n`;
    if (event.location) {
      text += `   📍 ${event.location}\n`;
    }
  });

  return {
    message: { text },
    keyboard: {
      type: 'buttons',
      buttons: ['➕ 새 일정 추가', '👥 친구와 약속', '🏠 메인 메뉴']
    }
  };
}

// 약속 제안 생성
async function createAppointmentProposal(proposal: any): Promise<KakaoResponse> {
  try {
    if (!proposal.proposerId) {
      return {
        message: {
          text: '❌ 서비스에 연결 후 친구와 약속을 잡을 수 있어요.\n아래 버튼을 눌러 연결해주세요!'
        },
        keyboard: {
          type: 'buttons',
          buttons: ['🔗 서비스 연결하기', '🏠 메인 메뉴']
        }
      };
    }

    // 1. 친구 찾기 (이름으로 검색)
    const { data: friends } = await supabase
      .from('friends')
      .select(`
        id,
        friend_id,
        nickname,
        user:users!friends_friend_id_fkey(id, name, email)
      `)
      .eq('user_id', proposal.proposerId)
      .eq('status', 'accepted');

    const foundFriend = friends?.find(f =>
      f.nickname?.toLowerCase().includes(proposal.friendName.toLowerCase()) ||
      (f.user as any)?.name?.toLowerCase().includes(proposal.friendName.toLowerCase())
    );

    if (!foundFriend) {
      return {
        message: {
          text: `❌ "${proposal.friendName}"님을 친구 목록에서 찾을 수 없어요.\n\n` +
            `먼저 친구 추가를 해주세요!`
        },
        keyboard: {
          type: 'buttons',
          buttons: ['👥 친구 추가', '🏠 메인 메뉴']
        }
      };
    }

    // 2. 시간 파싱 (한국어 날짜/시간 처리)
    const { parseKoreanDateTime } = await import('@/lib/date-parser');
    let proposedDateTime: Date;

    try {
      const parsedResult = await parseKoreanDateTime(proposal.date, proposal.time);
      proposedDateTime = new Date(parsedResult.date + ' ' + parsedResult.time);
    } catch (error) {
      return {
        message: {
          text: '❌ 날짜나 시간 형식을 인식할 수 없어요.\n\n' +
            '예: "내일 오후 3시", "금요일 저녁 7시"'
        }
      };
    }

    // 3. 약속 제안 데이터베이스에 저장
    const { data: meetingProposal, error } = await supabase
      .from('meeting_proposals')
      .insert({
        proposer_id: proposal.proposerId,
        invitee_id: foundFriend.friend_id,
        title: `${foundFriend.nickname || (foundFriend.user as any)?.name}님과의 약속`,
        proposed_time: proposedDateTime.toISOString(),
        location: proposal.location,
        meeting_type: 'other',
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      logger.error('Meeting proposal creation error:', error);
      return {
        message: {
          text: '❌ 약속 제안 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
        }
      };
    }

    // 4. 친구에게 알림 발송 (실제 앱에서는 푸시 알림 등)
    // TODO: 실시간 알림 시스템 연동

    return {
      message: {
        text: `✅ 약속 제안이 완료되었어요!\n\n` +
          `👤 ${foundFriend.nickname || (foundFriend.user as any)?.name}님과의 약속\n` +
          `📅 ${proposedDateTime.toLocaleDateString('ko-KR')} ${proposedDateTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}\n` +
          `📍 ${proposal.location}\n\n` +
          `상대방이 응답하면 알려드릴게요! 🔔`
      },
      keyboard: {
        type: 'buttons',
        buttons: ['📋 제안 목록', '📅 일정 확인', '🏠 메인 메뉴']
      }
    };

  } catch (error) {
    logger.error('Appointment proposal error:', error);
    return {
      message: {
        text: '❌ 약속 제안 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
      }
    };
  }
}

// 회원가입 안내
function createRegistrationPrompt(): KakaoResponse {
  const registrationUrl = `${env.get('NEXT_PUBLIC_APP_URL')}/auth/register?from=kakao`;

  return {
    message: {
      text: '📱 글피 캘린더 서비스와 연결하면 더 많은 기능을 사용할 수 있어요!\n\n' +
        '✨ 연결하면 가능한 기능:\n' +
        '• 모든 일정을 한 곳에서 관리\n' +
        '• AI 일정 추천\n' +
        '• 친구들과 자동 약속 조율\n' +
        '• Google Calendar 동기화\n\n' +
        '아래 버튼을 눌러 간편하게 연결하세요!',
      message_button: {
        label: '📱 서비스 연결하기',
        url: registrationUrl
      }
    }
  };
}

// 도움말 응답
function createHelpResponse(): KakaoResponse {
  return {
    message: {
      text: 'ℹ️ 글피 캘린더 봇 사용법\n\n' +
        '💬 자연스럽게 대화하세요:\n' +
        '• "오늘 일정 알려줘"\n' +
        '• "내일 오후 3시 회의 추가"\n' +
        '• "김철수와 금요일 점심 약속"\n\n' +
        '🔗 서비스 연결:\n' +
        '• 웹 서비스와 연결하면 더 많은 기능 사용 가능\n\n' +
        '📧 문의: support@geulpi.com'
    },
    keyboard: {
      type: 'buttons',
      buttons: ['🏠 메인 메뉴', '🔗 서비스 연결하기']
    }
  };
}

// 기본 응답
function createDefaultResponse(): KakaoResponse {
  return {
    message: {
      text: '무엇을 도와드릴까요?'
    },
    keyboard: {
      type: 'buttons',
      buttons: ['📅 일정 보기', '➕ 새 일정', '👥 친구와 약속', 'ℹ️ 도움말']
    }
  };
}

// 에러 응답
function createErrorResponse(): KakaoResponse {
  return {
    message: {
      text: '죄송합니다. 일시적인 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.'
    }
  };
}