import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  env.get('NEXT_PUBLIC_SUPABASE_URL')!,
  env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Discord 인터랙션 타입
interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number; // 1: PING, 2: APPLICATION_COMMAND, 3: MESSAGE_COMPONENT
  data?: {
    id: string;
    name: string;
    type: number;
    options?: Array<{
      name: string;
      type: number;
      value: any;
    }>;
  };
  guild_id?: string;
  channel_id?: string;
  member?: {
    user: {
      id: string;
      username: string;
      discriminator: string;
    };
  };
  user?: {
    id: string;
    username: string;
    discriminator: string;
  };
  token: string;
  version: number;
}

// Discord 응답 타입
interface DiscordResponse {
  type: number; // 1: PONG, 4: CHANNEL_MESSAGE_WITH_SOURCE, 5: DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
  data?: {
    content?: string;
    embeds?: Array<{
      title?: string;
      description?: string;
      color?: number;
      fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
      }>;
      footer?: {
        text: string;
      };
      timestamp?: string;
    }>;
    components?: Array<{
      type: number;
      components: Array<{
        type: number;
        style?: number;
        label?: string;
        custom_id?: string;
        url?: string;
        emoji?: {
          name: string;
        };
      }>;
    }>;
  };
}

// Discord 서명 검증
function verifyDiscordSignature(body: string, signature: string, timestamp: string): boolean {
  const publicKey = env.get('DISCORD_PUBLIC_KEY');
  if (!publicKey) {
    logger.error('[Discord Bot] DISCORD_PUBLIC_KEY not configured');
    return false;
  }

  try {
    const nacl = require('tweetnacl');

    const timestampedBody = timestamp + body;
    const sig = Buffer.from(signature, 'hex');
    const pub = Buffer.from(publicKey, 'hex');
    const message = Buffer.from(timestampedBody, 'utf8');

    const isValid = nacl.sign.detached.verify(message, sig, pub);

    if (!isValid) {
      logger.error('[Discord Bot] Signature verification failed');
    }

    return isValid;
  } catch (error) {
    logger.error('[Discord Bot] Signature verification error:', error);
    return false;
  }
}

// POST: Discord 인터랙션 수신
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get('X-Signature-Ed25519');
    const timestamp = request.headers.get('X-Signature-Timestamp');

    // 서명 검증 (Discord에서 서명을 보내면 항상 검증)
    if (signature && timestamp) {
      if (!verifyDiscordSignature(bodyText, signature, timestamp)) {
        logger.error('[Discord Bot] Signature verification failed');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const interaction: DiscordInteraction = JSON.parse(bodyText);

    logger.debug(`[Discord Bot] Interaction: ${interaction.type} - ${interaction.data?.name} from ${interaction.user?.username || interaction.member?.user.username}`);

    // PING 응답 (Discord 필수)
    if (interaction.type === 1) {
      logger.debug('[Discord Bot] Sending PING response');
      return NextResponse.json({ type: 1 }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    let response: DiscordResponse;

    // 슬래시 커맨드 처리
    if (interaction.type === 2 && interaction.data) {
      // help 명령어는 즉시 응답 (사용자 정보 불필요)
      if (interaction.data.name === 'help') {
        response = createHelpResponse();
      } else {
        // 다른 명령어들은 사용자 정보 필요
        const userInfo = await getOrCreateDiscordUser(
          interaction.user?.id || interaction.member?.user.id!,
          interaction.user?.username || interaction.member?.user.username!
        );
        response = await handleSlashCommand(interaction.data, userInfo, interaction);
      }
    }
    // 버튼/컴포넌트 인터랙션 처리
    else if (interaction.type === 3 && interaction.data) {
      const userInfo = await getOrCreateDiscordUser(
        interaction.user?.id || interaction.member?.user.id!,
        interaction.user?.username || interaction.member?.user.username!
      );
      response = await handleComponentInteraction(interaction.data, userInfo, interaction);
    }
    // 기본 응답
    else {
      response = createDefaultResponse();
    }

    logger.debug('[Discord Bot] Sending response', { value: JSON.stringify(response, null, 2) });
    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    logger.error('[Discord Bot] Error:', error);
    const errorResponse = createErrorResponse();
    logger.debug('[Discord Bot] Sending error response', { value: JSON.stringify(errorResponse, null, 2) });
    return NextResponse.json(errorResponse, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// Discord 사용자 조회/생성
async function getOrCreateDiscordUser(discordUserId: string, username: string) {
  // messenger_integrations 테이블에서 조회
  const { data: integration } = await supabase
    .from('messenger_integrations')
    .select('*')
    .eq('platform', 'discord')
    .eq('platform_user_id', discordUserId)
    .single();

  if (integration) {
    // 기존 사용자
    return {
      userId: integration.user_id,
      isRegistered: !!integration.user_id,
      preferences: integration.preferences || {},
      username
    };
  } else {
    // 신규 사용자 - 임시 등록
    const { data: newIntegration } = await supabase
      .from('messenger_integrations')
      .insert({
        platform: 'discord',
        platform_user_id: discordUserId,
        preferences: {
          notifications: true,
          language: 'ko',
          username
        }
      })
      .select()
      .single();

    return {
      userId: null,
      isRegistered: false,
      preferences: newIntegration?.preferences || {},
      username
    };
  }
}

// 슬래시 커맨드 처리
async function handleSlashCommand(
  commandData: any,
  userInfo: any,
  interaction: DiscordInteraction
): Promise<DiscordResponse> {
  switch (commandData.name) {
    case 'schedule':
      return await handleScheduleCommand(commandData.options, userInfo, interaction);

    case 'today':
      return await handleTodayCommand(userInfo, interaction);

    case 'friends':
      return await handleFriendsCommand(commandData.options, userInfo, interaction);

    case 'meet':
      return await handleMeetCommand(commandData.options, userInfo, interaction);

    case 'help':
      return createHelpResponse();

    default:
      return createDefaultResponse();
  }
}

// 컴포넌트 인터랙션 처리
async function handleComponentInteraction(
  componentData: any,
  userInfo: any,
  interaction: DiscordInteraction
): Promise<DiscordResponse> {
  const customId = componentData.custom_id;

  if (customId?.startsWith('register_')) {
    return createRegistrationPrompt();
  }

  if (customId?.startsWith('schedule_')) {
    const eventId = customId.replace('schedule_', '');
    return await handleScheduleConfirmation(eventId, userInfo);
  }

  return createDefaultResponse();
}

// 일정 명령어 처리
async function handleScheduleCommand(
  options: any[],
  userInfo: any,
  interaction: DiscordInteraction
): Promise<DiscordResponse> {
  if (!userInfo.isRegistered) {
    return createRegistrationPrompt();
  }

  const title = options?.find(opt => opt.name === 'title')?.value;
  const datetime = options?.find(opt => opt.name === 'datetime')?.value;
  const location = options?.find(opt => opt.name === 'location')?.value;

  // 일정 생성 로직 (실제 구현 필요)
  return {
    type: 4,
    data: {
      embeds: [{
        title: '📅 새 일정이 생성되었습니다!',
        description: `**${title}**\n📅 ${datetime}\n📍 ${location || '장소 미정'}`,
        color: 0x5865F2, // Discord Blurple
        footer: {
          text: '글피 캘린더'
        },
        timestamp: new Date().toISOString()
      }],
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 1,
          label: '일정 수정',
          custom_id: `edit_${title}`,
          emoji: { name: '✏️' }
        }, {
          type: 2,
          style: 2,
          label: '친구 초대',
          custom_id: `invite_${title}`,
          emoji: { name: '👥' }
        }]
      }]
    }
  };
}

// 오늘 일정 명령어 처리
async function handleTodayCommand(
  userInfo: any,
  interaction: DiscordInteraction
): Promise<DiscordResponse> {
  if (!userInfo.isRegistered) {
    return createRegistrationPrompt();
  }

  // 오늘 일정 조회 (실제 구현 필요)
  const events = await getTodayEvents(userInfo.userId);

  if (events.length === 0) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: '📅 오늘의 일정',
          description: '오늘은 등록된 일정이 없습니다. 😊\n새로운 일정을 추가해보세요!',
          color: 0x57F287, // Green
          footer: {
            text: '글피 캘린더'
          }
        }],
        components: [{
          type: 1,
          components: [{
            type: 2,
            style: 1,
            label: '새 일정 추가',
            custom_id: 'schedule_new',
            emoji: { name: '➕' }
          }]
        }]
      }
    };
  }

  const eventFields = events.map((event, index) => {
    const startTime = new Date(event.start_time);
    const timeStr = startTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      name: `${index + 1}. ${timeStr}`,
      value: `**${event.summary}**\n${event.location ? `📍 ${event.location}` : ''}`,
      inline: false
    };
  });

  return {
    type: 4,
    data: {
      embeds: [{
        title: `📅 오늘의 일정 (${events.length}개)`,
        color: 0x5865F2,
        fields: eventFields,
        footer: {
          text: '글피 캘린더'
        },
        timestamp: new Date().toISOString()
      }]
    }
  };
}

// 친구 명령어 처리
async function handleFriendsCommand(
  options: any[],
  userInfo: any,
  interaction: DiscordInteraction
): Promise<DiscordResponse> {
  if (!userInfo.isRegistered) {
    return createRegistrationPrompt();
  }

  return {
    type: 4,
    data: {
      embeds: [{
        title: '👥 친구 관리',
        description: '친구와 함께 일정을 관리해보세요!',
        color: 0xFEE75C, // Yellow
        fields: [{
          name: '사용 가능한 기능',
          value: '• `/meet @친구` - 친구와 약속 잡기\n• 가능한 시간 자동 찾기\n• 중간 지점 장소 추천',
          inline: false
        }]
      }],
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 5,
          label: '웹에서 친구 관리',
          url: `${env.get('NEXT_PUBLIC_APP_URL')}/friends`
        }]
      }]
    }
  };
}

// 만나기 명령어 처리
async function handleMeetCommand(
  options: any[],
  userInfo: any,
  interaction: DiscordInteraction
): Promise<DiscordResponse> {
  if (!userInfo.isRegistered) {
    return createRegistrationPrompt();
  }

  const friend = options?.find(opt => opt.name === 'friend')?.value;
  const date = options?.find(opt => opt.name === 'date')?.value;

  return {
    type: 4,
    data: {
      embeds: [{
        title: '🤝 친구와 만나기',
        description: `**${friend}**님과의 약속을 준비하고 있습니다...`,
        color: 0xEB459E, // Pink
        fields: [{
          name: '📅 요청된 날짜',
          value: date || '오늘',
          inline: true
        }, {
          name: '⏰ 상태',
          value: '가능한 시간 검색 중...',
          inline: true
        }],
        footer: {
          text: '잠시만 기다려주세요'
        }
      }],
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 2,
          label: '장소 추천받기',
          custom_id: `location_${friend}`,
          emoji: { name: '🗺️' }
        }]
      }]
    }
  };
}

// 오늘 일정 조회 (카카오톡과 동일)
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

// 회원가입 안내
function createRegistrationPrompt(): DiscordResponse {
  const registrationUrl = `${env.get('NEXT_PUBLIC_APP_URL')}/auth/register?from=discord`;

  return {
    type: 4,
    data: {
      embeds: [{
        title: '🚀 글피 캘린더와 연결하기',
        description: 'Discord에서 더 많은 기능을 사용하려면 서비스에 연결해주세요!',
        color: 0x5865F2,
        fields: [{
          name: '✨ 연결하면 가능한 기능',
          value: '• AI 일정 추천 및 자동 생성\n• 친구들과 실시간 약속 조율\n• Google Calendar 동기화\n• 중간 지점 장소 추천',
          inline: false
        }],
        footer: {
          text: '글피 캘린더 - 스마트한 일정 관리'
        }
      }],
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 5,
          label: '🔗 서비스 연결하기',
          url: registrationUrl
        }]
      }]
    }
  };
}

// 도움말 응답
function createHelpResponse(): DiscordResponse {
  return {
    type: 4,
    data: {
      embeds: [{
        title: '📚 글피 캘린더 봇 사용법',
        description: 'Discord에서 스마트하게 일정을 관리해보세요!',
        color: 0x5865F2,
        fields: [{
          name: '📅 기본 명령어',
          value: '• `/schedule` - 새 일정 추가\n• `/today` - 오늘 일정 보기\n• `/friends` - 친구 관리',
          inline: false
        }, {
          name: '🤝 협업 기능',
          value: '• `/meet @친구` - 친구와 약속 잡기\n• 자동 시간 조율\n• 장소 추천',
          inline: false
        }, {
          name: '🔗 추가 기능',
          value: '[웹 서비스](https://geulpi.com)에서 더 많은 기능을 이용할 수 있습니다.',
          inline: false
        }],
        footer: {
          text: '문의: support@geulpi.com'
        }
      }]
    }
  };
}

// 기본 응답
function createDefaultResponse(): DiscordResponse {
  return {
    type: 4,
    data: {
      content: '안녕하세요! `/help` 명령어로 사용법을 확인해보세요. 😊'
    }
  };
}

// 에러 응답
function createErrorResponse(): DiscordResponse {
  return {
    type: 4,
    data: {
      embeds: [{
        title: '⚠️ 오류 발생',
        description: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        color: 0xED4245 // Red
      }]
    }
  };
}

// 일정 확인 처리
async function handleScheduleConfirmation(eventId: string, userInfo: any): Promise<DiscordResponse> {
  return {
    type: 4,
    data: {
      embeds: [{
        title: '✅ 일정이 확인되었습니다',
        description: `일정 ID: ${eventId}`,
        color: 0x57F287
      }]
    }
  };
}