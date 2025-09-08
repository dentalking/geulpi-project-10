import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 사용자 프로필 조회
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // 프로필 조회
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: no rows returned
      console.error('Error fetching profile:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // 프로필이 없으면 기본 프로필 생성
    if (!profile) {
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: user.id,
          full_name: user.user_metadata?.name || '',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
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
    console.error('Error in GET /api/profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: 사용자 프로필 업데이트
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // 민감한 필드는 제외하고 업데이트
    const { user_id, id, created_at, ...updateData } = body;

    // 프로필 업데이트
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
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
    console.error('Error in PUT /api/profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: 부분 업데이트 (특정 필드만)
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
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
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        [field]: value,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile field:', error);
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
    console.error('Error in PATCH /api/profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}