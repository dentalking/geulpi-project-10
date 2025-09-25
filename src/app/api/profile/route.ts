import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { EnhancedErrorLogger } from '@/lib/enhanced-error-handler';
import { verifyToken } from '@/lib/auth/supabase-auth';

const supabase = createClient(
  env.get('NEXT_PUBLIC_SUPABASE_URL')!,
  env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// GET: 사용자 프로필 조회
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    // 1. JWT 이메일 인증 트랙 확인
    let authToken: string | null = null;
    if (authHeader?.startsWith('auth-token ')) {
      authToken = authHeader.substring(11);
    } else {
      authToken = cookieStore.get('auth-token')?.value || null;
    }

    logger.debug('Profile API GET: authHeader present', { value: !!authHeader });
    logger.debug('Profile API GET: authToken present', { value: !!authToken });

    if (authToken) {
      try {
        logger.debug('Profile API GET: Verifying JWT token...');
        const user = await verifyToken(authToken);
        if (user) {
          logger.debug('Profile API GET: JWT verification successful, userId', { value: user.id });
          userId = user.id;
        } else {
          logger.debug('Profile API GET: JWT verification returned null user');
        }
      } catch (error) {
        logger.error('Profile API GET: JWT auth verification failed:', error);
      }
    } else {
      logger.debug('Profile API GET: No auth token found in header or cookies');
    }

    // 2. Google OAuth 트랙 확인 (기존 시스템 보존)
    if (!userId) {
      const accessToken = cookieStore.get('access_token')?.value;
      if (accessToken) {
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
          if (!authError && user) {
            userId = user.id;
          }
        } catch (error) {
          logger.error('Google OAuth verification failed:', error);
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 프로필 조회
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: no rows returned
      return EnhancedErrorLogger.createApiErrorResponse(
        error,
        {
          userId: userId,
          action: 'fetch_profile',
          endpoint: '/api/profile',
          userAgent: request.headers.get('user-agent') || undefined
        },
        '프로필 정보를 불러올 수 없습니다.'
      );
    }

    // 프로필이 없으면 기본 프로필 생성
    if (!profile) {
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          full_name: '', // Email auth users don't have user_metadata from Google
        })
        .select()
        .single();

      if (createError) {
        logger.error('Error creating profile:', createError);
        return NextResponse.json(
          { success: false, error: 'Failed to create profile' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        profile: newProfile
      });
    }

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error) {
    logger.error('Error in GET /api/profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: 사용자 프로필 업데이트
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    // 1. JWT 이메일 인증 트랙 확인
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

    // 2. Google OAuth 트랙 확인 (기존 시스템 보존)
    if (!userId) {
      const accessToken = cookieStore.get('access_token')?.value;
      if (accessToken) {
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
          if (!authError && user) {
            userId = user.id;
          }
        } catch (error) {
          logger.error('Google OAuth verification failed:', error);
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // 민감한 필드는 제외하고 업데이트
    const { user_id, id, created_at, ...updateData } = body;

    // 프로필 업데이트
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating profile:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error) {
    logger.error('Error in PUT /api/profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: 부분 업데이트 (특정 필드만)
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    // 1. JWT 이메일 인증 트랙 확인
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

    // 2. Google OAuth 트랙 확인 (기존 시스템 보존)
    if (!userId) {
      const accessToken = cookieStore.get('access_token')?.value;
      if (accessToken) {
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
          if (!authError && user) {
            userId = user.id;
          }
        } catch (error) {
          logger.error('Google OAuth verification failed:', error);
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { field, value } = body;

    if (!field) {
      return NextResponse.json(
        { success: false, error: 'Field is required' },
        { status: 400 }
      );
    }

    // 허용된 필드만 업데이트
    const allowedFields = [
      'full_name', 'nickname', 'date_of_birth', 'occupation', 'bio',
      'home_address', 'home_latitude', 'home_longitude',
      'work_address', 'work_latitude', 'work_longitude',
      'work_start_time', 'work_end_time', 'working_days',
      'preferred_language', 'timezone', 'wake_up_time', 'sleep_time',
      'life_context', 'interests', 'goals', 'important_dates',
      'family_members', 'emergency_contact',
      'allergies', 'dietary_preferences', 'exercise_routine'
    ];

    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { success: false, error: 'Field not allowed' },
        { status: 400 }
      );
    }

    // 프로필 업데이트
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        [field]: value,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating profile field:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile field' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error) {
    logger.error('Error in PATCH /api/profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}