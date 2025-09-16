import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

// GET: 친구와 공통 가능한 시간 찾기
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    // JWT 이메일 인증 트랙 확인
    let authToken: string | null = null;
    if (authHeader?.startsWith('auth-token ')) {
      authToken = authHeader.substring(11);
    } else {
      authToken = cookieStore.get('auth-token')?.value || null;
    }

    if (authToken) {
      try {
        const user = await verifyToken(authToken);
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        console.error('JWT auth verification failed:', error);
      }
    }

    // Google OAuth 트랙 확인
    if (!userId) {
      const accessToken = cookieStore.get('access_token')?.value;
      if (accessToken) {
        try {
          const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (response.ok) {
            const userInfo = await response.json();
            const { data: dbUser } = await supabase
              .from('users')
              .select('id')
              .eq('email', userInfo.email)
              .single();

            if (dbUser) {
              userId = dbUser.id;
            }
          }
        } catch (error) {
          console.error('Google OAuth verification failed:', error);
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const friendId = searchParams.get('friendId');
    const startDate = searchParams.get('startDate') || new Date().toISOString();
    const endDate = searchParams.get('endDate') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const duration = parseInt(searchParams.get('duration') || '60'); // 기본 60분

    if (!friendId) {
      return NextResponse.json(
        { error: '친구 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 친구 관계 확인
    const { data: friendship } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .eq('status', 'accepted')
      .single();

    if (!friendship) {
      return NextResponse.json(
        { error: '친구 관계가 아닙니다' },
        { status: 403 }
      );
    }

    // 두 사용자의 일정 조회
    const [userEvents, friendEvents] = await Promise.all([
      supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .eq('status', 'confirmed'),
      supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', friendId)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .eq('status', 'confirmed')
    ]);

    // 사용자 프로필 정보 조회 (근무 시간 등)
    const [userProfile, friendProfile] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('work_start_time, work_end_time, working_days, wake_up_time, sleep_time')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('user_profiles')
        .select('work_start_time, work_end_time, working_days, wake_up_time, sleep_time')
        .eq('user_id', friendId)
        .single()
    ]);

    // 가능한 시간대 계산
    const availableSlots = findAvailableSlots(
      userEvents.data || [],
      friendEvents.data || [],
      userProfile.data,
      friendProfile.data,
      new Date(startDate),
      new Date(endDate),
      duration
    );

    // 최적의 시간대 추천
    const recommendedSlots = recommendBestSlots(availableSlots, friendship);

    return NextResponse.json({
      success: true,
      availableSlots: availableSlots.slice(0, 10), // 상위 10개만 반환
      recommendedSlots: recommendedSlots.slice(0, 3), // 상위 3개 추천
      totalAvailable: availableSlots.length
    });

  } catch (error) {
    console.error('Error in GET /api/friends/availability:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 가능한 시간대 찾기 알고리즘
function findAvailableSlots(
  userEvents: any[],
  friendEvents: any[],
  userProfile: any,
  friendProfile: any,
  startDate: Date,
  endDate: Date,
  duration: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const slotDuration = duration * 60 * 1000; // 분을 밀리초로 변환

  // 하루씩 검사
  const current = new Date(startDate);
  current.setHours(9, 0, 0, 0); // 오전 9시부터 시작

  while (current < endDate) {
    const dayOfWeek = current.toLocaleLowerCase();

    // 주말 제외 (옵션)
    if (current.getDay() === 0 || current.getDay() === 6) {
      current.setDate(current.getDate() + 1);
      current.setHours(9, 0, 0, 0);
      continue;
    }

    // 근무 시간 고려
    const workStart = userProfile?.work_start_time ?
      parseTime(userProfile.work_start_time) : { hour: 9, minute: 0 };
    const workEnd = userProfile?.work_end_time ?
      parseTime(userProfile.work_end_time) : { hour: 18, minute: 0 };

    // 점심시간 제외 (12:00 - 13:00)
    const lunchStart = 12;
    const lunchEnd = 13;

    // 오전 시간대 (9:00 - 12:00)
    for (let hour = workStart.hour; hour < lunchStart; hour++) {
      const slotStart = new Date(current);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + slotDuration);

      if (isTimeSlotAvailable(slotStart, slotEnd, userEvents, friendEvents)) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          available: true
        });
      }
    }

    // 오후 시간대 (13:00 - 18:00)
    for (let hour = lunchEnd; hour < workEnd.hour; hour++) {
      const slotStart = new Date(current);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + slotDuration);

      if (isTimeSlotAvailable(slotStart, slotEnd, userEvents, friendEvents)) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          available: true
        });
      }
    }

    // 저녁 시간대 (18:00 - 21:00)
    for (let hour = 18; hour < 21; hour++) {
      const slotStart = new Date(current);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + slotDuration);

      if (isTimeSlotAvailable(slotStart, slotEnd, userEvents, friendEvents)) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          available: true
        });
      }
    }

    current.setDate(current.getDate() + 1);
    current.setHours(9, 0, 0, 0);
  }

  return slots;
}

// 시간대가 사용 가능한지 확인
function isTimeSlotAvailable(
  start: Date,
  end: Date,
  userEvents: any[],
  friendEvents: any[]
): boolean {
  // 사용자 일정 확인
  for (const event of userEvents) {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    // 겹치는 일정이 있으면 false
    if (
      (start >= eventStart && start < eventEnd) ||
      (end > eventStart && end <= eventEnd) ||
      (start <= eventStart && end >= eventEnd)
    ) {
      return false;
    }
  }

  // 친구 일정 확인
  for (const event of friendEvents) {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    // 겹치는 일정이 있으면 false
    if (
      (start >= eventStart && start < eventEnd) ||
      (end > eventStart && end <= eventEnd) ||
      (start <= eventStart && end >= eventEnd)
    ) {
      return false;
    }
  }

  return true;
}

// 최적의 시간대 추천
function recommendBestSlots(slots: TimeSlot[], friendship: any): TimeSlot[] {
  // 점수 기반 추천 시스템
  const scoredSlots = slots.map(slot => {
    let score = 0;

    // 오후 2-4시 선호 (카페 미팅 적합)
    const hour = slot.start.getHours();
    if (hour >= 14 && hour <= 16) score += 3;

    // 저녁 6-7시 선호 (저녁 식사)
    if (hour >= 18 && hour <= 19) score += 2;

    // 주중보다 금요일 선호
    if (slot.start.getDay() === 5) score += 2;

    // 가까운 날짜 선호
    const daysFromNow = Math.floor((slot.start.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysFromNow <= 3) score += 3;
    else if (daysFromNow <= 7) score += 2;
    else score += 1;

    // 과거 미팅 패턴 고려 (common_event_types 활용)
    if (friendship?.common_event_types) {
      const commonTypes = friendship.common_event_types;
      // 저장된 패턴에 따라 점수 조정
      if (commonTypes?.preferred_time === 'afternoon' && hour >= 12 && hour <= 17) score += 2;
      if (commonTypes?.preferred_time === 'evening' && hour >= 17 && hour <= 21) score += 2;
    }

    return { ...slot, score };
  });

  // 점수 기준 정렬
  scoredSlots.sort((a, b) => (b as any).score - (a as any).score);

  return scoredSlots.map(({ score, ...slot }) => slot);
}

// 시간 문자열 파싱
function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(':').map(Number);
  return { hour, minute };
}