import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Test 1: Check if table exists
    const { data: tables, error: tableError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (tableError) {
      // Table doesn't exist, create it
      console.log('Table does not exist, creating...');
      
      // Create table using raw SQL
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS user_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          full_name TEXT,
          nickname TEXT,
          date_of_birth DATE,
          occupation TEXT,
          bio TEXT,
          home_address TEXT,
          home_latitude DECIMAL(10, 8),
          home_longitude DECIMAL(11, 8),
          work_address TEXT,
          work_latitude DECIMAL(10, 8),
          work_longitude DECIMAL(11, 8),
          work_start_time TIME,
          work_end_time TIME,
          working_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]'::jsonb,
          preferred_language VARCHAR(10) DEFAULT 'ko',
          timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
          wake_up_time TIME,
          sleep_time TIME,
          life_context JSONB DEFAULT '{}'::jsonb,
          interests TEXT[],
          goals TEXT[],
          important_dates JSONB DEFAULT '[]'::jsonb,
          family_members JSONB DEFAULT '[]'::jsonb,
          emergency_contact JSONB DEFAULT '{}'::jsonb,
          allergies TEXT[],
          dietary_preferences TEXT[],
          exercise_routine TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `;

      // Note: Direct SQL execution requires using Supabase Dashboard or migration files
      // For now, let's return the status
      return NextResponse.json({
        success: false,
        message: 'Table does not exist. Please run the SQL schema in Supabase Dashboard',
        sql: createTableSQL,
        error: tableError.message
      });
    }

    // Test 2: Get current user's profile
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    
    if (accessToken) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
      
      if (user) {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // No profile exists, create one
          const { data: newProfile, error: createError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
              user_id: user.id,
              full_name: user.user_metadata?.name || '',
            })
            .select()
            .single();

          return NextResponse.json({
            success: true,
            message: 'Profile created',
            profile: newProfile,
            error: createError
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Profile exists',
          profile,
          error: profileError
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Table exists',
      tableCheck: 'OK'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      details: error
    });
  }
}