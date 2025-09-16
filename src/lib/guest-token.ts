import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'guest-token-secret';

// 게스트 토큰 페이로드
interface GuestTokenPayload {
  type: 'guest';
  guestId: string;
  platform: 'kakao' | 'discord' | 'web';
  platformUserId?: string;
  expiresAt: Date;
  permissions: string[];
  metadata?: {
    friendId?: string; // 초대한 친구 ID
    eventId?: string; // 참여하는 이벤트 ID
    pollId?: string; // 투표 ID
  };
}

// 게스트 세션 정보
interface GuestSession {
  guestId: string;
  createdAt: Date;
  lastActivityAt: Date;
  actions: GuestAction[];
  canUpgrade: boolean; // 회원 전환 가능 여부
}

// 게스트 액션 기록
interface GuestAction {
  type: 'vote' | 'suggest' | 'view' | 'respond';
  timestamp: Date;
  details: any;
}

/**
 * 게스트 토큰 생성
 */
export function generateGuestToken(
  platform: 'kakao' | 'discord' | 'web',
  platformUserId?: string,
  metadata?: any
): string {
  const guestId = `guest_${crypto.randomBytes(8).toString('hex')}`;

  const payload: GuestTokenPayload = {
    type: 'guest',
    guestId,
    platform,
    platformUserId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일
    permissions: getGuestPermissions(platform),
    metadata
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d'
  });
}

/**
 * 게스트 토큰 검증
 */
export function verifyGuestToken(token: string): GuestTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as GuestTokenPayload;

    // 만료 체크
    if (new Date(payload.expiresAt) < new Date()) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Guest token verification failed:', error);
    return null;
  }
}

/**
 * 플랫폼별 게스트 권한 설정
 */
function getGuestPermissions(platform: string): string[] {
  const basePermissions = [
    'view_public_events',
    'vote_on_polls',
    'suggest_times',
    'suggest_places'
  ];

  switch (platform) {
    case 'kakao':
      return [...basePermissions, 'send_kakao_messages'];
    case 'discord':
      return [...basePermissions, 'send_discord_messages', 'join_voice'];
    case 'web':
      return [...basePermissions, 'limited_calendar_view'];
    default:
      return basePermissions;
  }
}

/**
 * 게스트 세션 생성
 */
export async function createGuestSession(
  supabase: any,
  guestToken: GuestTokenPayload
): Promise<GuestSession> {
  const session: GuestSession = {
    guestId: guestToken.guestId,
    createdAt: new Date(),
    lastActivityAt: new Date(),
    actions: [],
    canUpgrade: true
  };

  // DB에 게스트 세션 저장
  await supabase
    .from('guest_sessions')
    .insert({
      guest_id: session.guestId,
      platform: guestToken.platform,
      platform_user_id: guestToken.platformUserId,
      metadata: guestToken.metadata,
      created_at: session.createdAt,
      expires_at: guestToken.expiresAt
    });

  return session;
}

/**
 * 게스트 액션 기록
 */
export async function recordGuestAction(
  supabase: any,
  guestId: string,
  action: GuestAction
): Promise<void> {
  await supabase
    .from('guest_actions')
    .insert({
      guest_id: guestId,
      action_type: action.type,
      action_details: action.details,
      created_at: action.timestamp
    });

  // 세션 최근 활동 시간 업데이트
  await supabase
    .from('guest_sessions')
    .update({
      last_activity_at: new Date(),
      action_count: supabase.raw('action_count + 1')
    })
    .eq('guest_id', guestId);
}

/**
 * 게스트를 정식 사용자로 전환
 */
export async function upgradeGuestToUser(
  supabase: any,
  guestId: string,
  userId: string
): Promise<boolean> {
  try {
    // 1. 게스트 세션 조회
    const { data: session } = await supabase
      .from('guest_sessions')
      .select('*')
      .eq('guest_id', guestId)
      .single();

    if (!session) {
      return false;
    }

    // 2. 게스트 액션 이전
    await supabase
      .from('guest_actions')
      .update({ user_id: userId })
      .eq('guest_id', guestId);

    // 3. 관련 투표/제안 이전
    await supabase
      .from('meeting_polls')
      .update({
        participant_id: userId,
        participant_type: 'member'
      })
      .eq('participant_id', guestId)
      .eq('participant_type', 'guest');

    // 4. 게스트 세션 업데이트
    await supabase
      .from('guest_sessions')
      .update({
        upgraded_to_user_id: userId,
        upgraded_at: new Date()
      })
      .eq('guest_id', guestId);

    return true;
  } catch (error) {
    console.error('Failed to upgrade guest to user:', error);
    return false;
  }
}

/**
 * 게스트 초대 링크 생성
 */
export function generateGuestInviteLink(
  eventId: string,
  inviterId: string,
  platform: 'kakao' | 'discord' | 'web' = 'web'
): string {
  const token = generateGuestToken(platform, undefined, {
    friendId: inviterId,
    eventId: eventId
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/guest/join?token=${encodeURIComponent(token)}`;
}

/**
 * 게스트 권한 체크
 */
export function checkGuestPermission(
  guestToken: GuestTokenPayload,
  permission: string
): boolean {
  return guestToken.permissions.includes(permission);
}

/**
 * 게스트 활동 제한 체크
 */
export async function checkGuestLimits(
  supabase: any,
  guestId: string
): Promise<{ canAct: boolean; reason?: string }> {
  // 최근 24시간 동안의 액션 수 체크
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { data: recentActions, count } = await supabase
    .from('guest_actions')
    .select('*', { count: 'exact' })
    .eq('guest_id', guestId)
    .gte('created_at', oneDayAgo.toISOString());

  // 일일 액션 제한 (예: 20개)
  const DAILY_ACTION_LIMIT = 20;

  if ((count || 0) >= DAILY_ACTION_LIMIT) {
    return {
      canAct: false,
      reason: '일일 활동 한도를 초과했습니다. 서비스에 가입하면 제한 없이 이용할 수 있습니다.'
    };
  }

  return { canAct: true };
}

/**
 * 게스트 세션 정리 (만료된 세션 삭제)
 */
export async function cleanupExpiredGuestSessions(supabase: any): Promise<void> {
  const now = new Date();

  // 만료된 세션 삭제
  await supabase
    .from('guest_sessions')
    .delete()
    .lt('expires_at', now.toISOString())
    .is('upgraded_to_user_id', null);

  // 30일 이상 비활성 세션 삭제
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await supabase
    .from('guest_sessions')
    .delete()
    .lt('last_activity_at', thirtyDaysAgo.toISOString())
    .is('upgraded_to_user_id', null);
}