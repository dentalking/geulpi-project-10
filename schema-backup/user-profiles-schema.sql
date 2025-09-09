-- User Profiles Table for storing personal context
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    full_name TEXT,
    nickname TEXT,
    date_of_birth DATE,
    occupation TEXT,
    bio TEXT,
    
    -- Location Information
    home_address TEXT,
    home_latitude DECIMAL(10, 8),
    home_longitude DECIMAL(11, 8),
    work_address TEXT,
    work_latitude DECIMAL(10, 8),
    work_longitude DECIMAL(11, 8),
    
    -- Work/School Schedule
    work_start_time TIME,
    work_end_time TIME,
    working_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]'::jsonb,
    
    -- Personal Preferences
    preferred_language VARCHAR(10) DEFAULT 'ko',
    timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
    wake_up_time TIME,
    sleep_time TIME,
    
    -- Life Context (structured data for AI)
    life_context JSONB DEFAULT '{}'::jsonb, -- Flexible field for additional context
    interests TEXT[], -- Array of interests/hobbies
    goals TEXT[], -- Personal goals
    important_dates JSONB DEFAULT '[]'::jsonb, -- Important recurring dates
    
    -- Family/Relationships
    family_members JSONB DEFAULT '[]'::jsonb, -- Array of family member info
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    
    -- Health Information (optional)
    allergies TEXT[],
    dietary_preferences TEXT[],
    exercise_routine TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a function to initialize user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'name')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();