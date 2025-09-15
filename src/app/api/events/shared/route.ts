import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/email-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { handleApiError, AuthError } from '@/lib/api-errors';

// GET: 나와 공유된 이벤트들 조회
export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const authToken = cookieStore.get('auth-token')?.value;
        
        let userId: string | null = null;

        // Check for email auth
        if (authToken) {
            try {
                const user = await verifyToken(authToken);
                if (user) {
                    userId = user.id;
                }
            } catch (error) {
                console.error('Email auth verification failed:', error);
            }
        }

        // Check for Google OAuth
        if (!userId) {
            const cookieStore = await cookies();
            const accessToken = cookieStore.get('access_token')?.value;
            if (accessToken) {
                const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
                userId = user?.id || null;
            }
        }

        if (!userId) {
            return handleApiError(new AuthError());
        }

        const { searchParams } = new URL(request.url);
        const timeMin = searchParams.get('timeMin');
        const timeMax = searchParams.get('timeMax');
        const maxResults = parseInt(searchParams.get('maxResults') || '50');

        // 나와 공유된 이벤트들 조회 (다른 사람이 만든 이벤트 중 shared_with에 내가 포함된 것들)
        let query = supabaseAdmin
            .from('calendar_events')
            .select(`
                id,
                summary,
                description,
                location,
                start_time,
                end_time,
                is_all_day,
                timezone,
                attendees,
                reminders,
                recurrence,
                status,
                visibility,
                color_id,
                category,
                tags,
                shared_with,
                share_permission,
                source,
                created_at,
                updated_at,
                user:users!calendar_events_user_id_fkey(id, email, name)
            `)
            .contains('shared_with', [userId])
            .neq('user_id', userId) // 내가 만든 이벤트는 제외
            .order('start_time', { ascending: true })
            .limit(maxResults);

        // 시간 필터 적용
        if (timeMin) {
            query = query.gte('start_time', timeMin);
        }
        if (timeMax) {
            query = query.lte('end_time', timeMax);
        }

        const { data: sharedEvents, error } = await query;

        if (error) {
            console.error('Error fetching shared events:', error);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch shared events'
            }, { status: 500 });
        }

        // 이벤트 데이터 변환
        const events = (sharedEvents || []).map(event => ({
            id: event.id,
            summary: event.summary,
            description: event.description,
            location: event.location,
            start: {
                dateTime: event.start_time,
                timeZone: event.timezone || 'Asia/Seoul'
            },
            end: {
                dateTime: event.end_time,
                timeZone: event.timezone || 'Asia/Seoul'
            },
            isAllDay: event.is_all_day,
            attendees: event.attendees ? JSON.parse(event.attendees) : [],
            reminders: event.reminders ? JSON.parse(event.reminders) : {},
            recurrence: event.recurrence,
            status: event.status,
            visibility: event.visibility,
            colorId: event.color_id,
            category: event.category,
            tags: event.tags,
            source: 'shared',
            sharePermission: event.share_permission,
            created: event.created_at,
            updated: event.updated_at,
            owner: {
                id: (event.user as any)?.id || null,
                email: (event.user as any)?.email || null,
                name: (event.user as any)?.name || null
            }
        }));

        return NextResponse.json({
            success: true,
            events,
            total: events.length,
            message: `${events.length}개의 공유된 이벤트를 찾았습니다.`
        });

    } catch (error) {
        return handleApiError(error);
    }
}

// POST: 친구의 캘린더 전체 공유 설정
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const authToken = cookieStore.get('auth-token')?.value;
        const { friendId, permissionLevel, shareAllEvents, sharedCategories, hideDetails } = await request.json();
        
        if (!friendId) {
            return NextResponse.json({
                success: false,
                error: 'Friend ID is required'
            }, { status: 400 });
        }

        let userId: string | null = null;

        // Check for email auth
        if (authToken) {
            try {
                const user = await verifyToken(authToken);
                if (user) {
                    userId = user.id;
                }
            } catch (error) {
                console.error('Email auth verification failed:', error);
            }
        }

        // Check for Google OAuth
        if (!userId) {
            const cookieStore = await cookies();
            const accessToken = cookieStore.get('access_token')?.value;
            if (accessToken) {
                const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
                userId = user?.id || null;
            }
        }

        if (!userId) {
            return handleApiError(new AuthError());
        }

        // 친구 관계 확인
        const { data: friendship, error: friendError } = await supabaseAdmin
            .from('friends')
            .select('id')
            .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
            .eq('status', 'accepted')
            .single();

        if (friendError || !friendship) {
            return NextResponse.json({
                success: false,
                error: 'Friend relationship not found'
            }, { status: 404 });
        }

        // 기존 캘린더 공유 설정 확인
        const { data: existingShare, error: checkError } = await supabaseAdmin
            .from('calendar_sharing')
            .select('id')
            .eq('owner_id', userId)
            .eq('shared_with_id', friendId)
            .single();

        if (existingShare) {
            // 기존 설정 업데이트
            const { error: updateError } = await supabaseAdmin
                .from('calendar_sharing')
                .update({
                    permission_level: permissionLevel || 'view',
                    share_all_events: shareAllEvents || false,
                    shared_categories: sharedCategories ? JSON.stringify(sharedCategories) : null,
                    hide_details: hideDetails || false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingShare.id);

            if (updateError) {
                console.error('Error updating calendar sharing:', updateError);
                return NextResponse.json({
                    success: false,
                    error: 'Failed to update calendar sharing'
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: '캘린더 공유 설정을 업데이트했습니다.'
            });
        } else {
            // 새로운 공유 설정 생성
            const { error: createError } = await supabaseAdmin
                .from('calendar_sharing')
                .insert({
                    owner_id: userId,
                    shared_with_id: friendId,
                    permission_level: permissionLevel || 'view',
                    share_all_events: shareAllEvents || false,
                    shared_categories: sharedCategories ? JSON.stringify(sharedCategories) : null,
                    hide_details: hideDetails || false
                });

            if (createError) {
                console.error('Error creating calendar sharing:', createError);
                return NextResponse.json({
                    success: false,
                    error: 'Failed to create calendar sharing'
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: '캘린더를 친구와 공유했습니다.'
            });
        }

    } catch (error) {
        return handleApiError(error);
    }
}