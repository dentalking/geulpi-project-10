import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { supabaseEmailService } from '@/services/email/SupabaseEmailService';

const supabase = createClient(
  env.get('NEXT_PUBLIC_SUPABASE_URL')!,
  env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface MeetingProposal {
  id?: string;
  proposer_id: string;
  invitee_id: string;
  proposed_time: Date;
  duration: number;
  location?: string;
  title: string;
  description?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'confirmed';
  suggested_locations?: string[];
  meeting_type?: 'coffee' | 'meal' | 'online' | 'activity' | 'other';
}

// POST: 친구와 약속 제안하기
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    // 인증 확인
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
        logger.error('JWT auth verification failed:', error);
      }
    }

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
          logger.error('Google OAuth verification failed:', error);
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      friendId,
      dateTime,
      duration = 60,
      location,
      title,
      description,
      autoSelect = false,
      meetingType = 'coffee'
    } = body;

    if (!friendId || (!dateTime && !autoSelect)) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다' },
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

    let proposedDateTime = dateTime;

    // 자동 선택 모드일 경우 최적 시간 찾기
    if (autoSelect) {
      // 가능한 시간대 조회
      const availabilityResponse = await fetch(
        `${env.get('NEXT_PUBLIC_APP_URL')}/api/friends/availability?friendId=${friendId}`,
        {
          headers: {
            'Authorization': request.headers.get('authorization') || '',
            'Cookie': request.headers.get('cookie') || ''
          }
        }
      );

      if (!availabilityResponse.ok) {
        return NextResponse.json(
          { error: '가능한 시간을 찾을 수 없습니다' },
          { status: 400 }
        );
      }

      const availabilityData = await availabilityResponse.json();
      if (!availabilityData.recommendedSlots || availabilityData.recommendedSlots.length === 0) {
        return NextResponse.json(
          { error: '일주일 내 가능한 시간이 없습니다' },
          { status: 400 }
        );
      }

      // 첫 번째 추천 시간 사용
      proposedDateTime = availabilityData.recommendedSlots[0].start;
    }

    // 위치 추천 (common_locations 활용)
    let suggestedLocations: string[] = [];
    if (!location) {
      if (friendship.common_locations && Array.isArray(friendship.common_locations)) {
        suggestedLocations = friendship.common_locations.slice(0, 3);
      } else {
        // 기본 추천 위치
        suggestedLocations = [
          '스타벅스 강남점',
          '투썸플레이스 역삼점',
          '온라인 미팅 (Zoom)'
        ];
      }
    }

    // 임시 이벤트 생성 (pending 상태)
    const proposalData = {
      user_id: userId,
      summary: title || `${friendship.nickname || '친구'}와(과)의 약속`,
      description: description || '친구와의 약속 (승인 대기 중)',
      location: location || suggestedLocations[0],
      start_time: proposedDateTime,
      end_time: new Date(new Date(proposedDateTime).getTime() + duration * 60 * 1000).toISOString(),
      status: 'tentative', // 미확정 상태
      attendees: [
        { email: userId, status: 'accepted' },
        { email: friendId, status: 'needsAction' }
      ],
      metadata: {
        type: 'friend_meeting',
        proposer_id: userId,
        invitee_id: friendId,
        meeting_type: meetingType,
        suggested_locations: suggestedLocations,
        proposal_status: 'pending'
      }
    };

    const { data: proposedEvent, error: eventError } = await supabase
      .from('calendar_events')
      .insert(proposalData)
      .select()
      .single();

    if (eventError) {
      logger.error('Error creating meeting proposal:', eventError);
      return NextResponse.json(
        { error: '약속 제안 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    // 친구에게 알림 전송 (이메일/푸시 알림)
    try {
      const { data: friendUser } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', friendId)
        .single();

      const { data: proposerUser } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (friendUser?.email) {
        await supabaseEmailService.sendMeetingProposal({
          to: friendUser.email,
          proposerName: proposerUser?.name || proposerUser?.email || 'Friend',
          meetingTitle: `${proposerUser?.name || 'Friend'}님과의 약속`,
          proposedTime: new Date(proposedDateTime).toLocaleString('ko-KR'),
          proposedLocation: location || suggestedLocations[0]
        });
      }
    } catch (error) {
      logger.error('Failed to send notification:', error);
      // 알림 실패해도 계속 진행
    }

    // common_locations 업데이트 (학습)
    if (location) {
      const currentLocations = friendship.common_locations || [];
      if (!currentLocations.includes(location)) {
        currentLocations.unshift(location);
        if (currentLocations.length > 10) {
          currentLocations.pop(); // 최대 10개까지만 저장
        }

        await supabase
          .from('friends')
          .update({ common_locations: currentLocations })
          .eq('id', friendship.id);
      }
    }

    // common_event_types 업데이트 (패턴 학습)
    const eventHour = new Date(proposedDateTime).getHours();
    let preferredTime = 'morning';
    if (eventHour >= 12 && eventHour < 17) preferredTime = 'afternoon';
    else if (eventHour >= 17) preferredTime = 'evening';

    await supabase
      .from('friends')
      .update({
        common_event_types: {
          ...friendship.common_event_types,
          preferred_time: preferredTime,
          last_meeting_type: meetingType,
          meeting_count: (friendship.common_event_types?.meeting_count || 0) + 1
        }
      })
      .eq('id', friendship.id);

    return NextResponse.json({
      success: true,
      message: '약속 제안을 전송했습니다',
      proposal: {
        id: proposedEvent.id,
        dateTime: proposedDateTime,
        duration,
        location: location || suggestedLocations[0],
        suggestedLocations,
        status: 'pending',
        title: proposalData.summary
      }
    });

  } catch (error) {
    logger.error('Error in POST /api/friends/schedule-meeting:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// PATCH: 약속 제안 응답 (수락/거절/수정 제안)
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    // 인증 확인
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
        logger.error('JWT auth verification failed:', error);
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { proposalId, action, alternativeTime, alternativeLocation } = body;

    if (!proposalId || !action) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다' },
        { status: 400 }
      );
    }

    // 제안된 약속 조회
    const { data: proposedEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (fetchError || !proposedEvent) {
      return NextResponse.json(
        { error: '약속 제안을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 권한 확인 (초대받은 사람만 응답 가능)
    if (proposedEvent.metadata?.invitee_id !== userId) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      );
    }

    if (action === 'accept') {
      // 약속 수락
      const { error: updateError } = await supabase
        .from('calendar_events')
        .update({
          status: 'confirmed',
          attendees: proposedEvent.attendees.map((a: any) =>
            a.email === userId ? { ...a, status: 'accepted' } : a
          ),
          metadata: {
            ...proposedEvent.metadata,
            proposal_status: 'accepted',
            accepted_at: new Date().toISOString()
          }
        })
        .eq('id', proposalId);

      if (updateError) {
        logger.error('Error accepting proposal:', updateError);
        return NextResponse.json(
          { error: '약속 수락에 실패했습니다' },
          { status: 500 }
        );
      }

      // 제안자에게 알림
      try {
        const { data: proposerUser } = await supabase
          .from('users')
          .select('email, name')
          .eq('id', proposedEvent.metadata.proposer_id)
          .single();

        if (proposerUser?.email) {
          await supabaseEmailService.sendMeetingAccepted({
            to: proposerUser.email,
            accepterName: userId,
            meetingTitle: proposedEvent.title || '약속',
            finalTime: new Date(proposedEvent.start_time).toLocaleString('ko-KR'),
            finalLocation: proposedEvent.location || '장소 미정'
          });
        }
      } catch (error) {
        logger.error('Failed to send acceptance notification:', error);
      }

      return NextResponse.json({
        success: true,
        message: '약속을 수락했습니다'
      });

    } else if (action === 'reject') {
      // 약속 거절 (이벤트 삭제)
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', proposalId);

      if (deleteError) {
        logger.error('Error rejecting proposal:', deleteError);
        return NextResponse.json(
          { error: '약속 거절에 실패했습니다' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '약속을 거절했습니다'
      });

    } else if (action === 'suggest') {
      // 수정 제안
      if (!alternativeTime && !alternativeLocation) {
        return NextResponse.json(
          { error: '대체 시간이나 장소를 제안해주세요' },
          { status: 400 }
        );
      }

      const updateData: any = {
        metadata: {
          ...proposedEvent.metadata,
          proposal_status: 'negotiating',
          suggestions: [
            ...(proposedEvent.metadata.suggestions || []),
            {
              by: userId,
              time: alternativeTime,
              location: alternativeLocation,
              suggested_at: new Date().toISOString()
            }
          ]
        }
      };

      if (alternativeTime) {
        updateData.start_time = alternativeTime;
        updateData.end_time = new Date(
          new Date(alternativeTime).getTime() +
          (proposedEvent.metadata.duration || 60) * 60 * 1000
        ).toISOString();
      }

      if (alternativeLocation) {
        updateData.location = alternativeLocation;
      }

      const { error: updateError } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', proposalId);

      if (updateError) {
        logger.error('Error suggesting alternative:', updateError);
        return NextResponse.json(
          { error: '수정 제안에 실패했습니다' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '수정 제안을 전송했습니다'
      });
    }

    return NextResponse.json(
      { error: '잘못된 액션입니다' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('Error in PATCH /api/friends/schedule-meeting:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}