-- 친구 관계 테이블
CREATE TABLE friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  friend_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, blocked
  relationship_type VARCHAR(50), -- 'friend', 'family', 'colleague', 'teammate'
  nickname VARCHAR(100), -- 사용자가 설정한 친구 별명
  notes TEXT, -- 메모 (예: "대학 동기", "프로젝트 A 팀원")
  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  
  -- 관계 컨텍스트 데이터
  meeting_frequency INT DEFAULT 0, -- 만난 횟수
  last_meeting_date DATE,
  common_locations JSONB, -- 자주 만나는 장소들
  common_event_types JSONB, -- 주로 함께하는 일정 유형
  
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- 친구 초대 테이블
CREATE TABLE friend_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES users(id),
  invitee_email VARCHAR(255) NOT NULL,
  invitation_code VARCHAR(100) UNIQUE NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, expired
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMP
);

-- 일정 공유 권한 테이블
CREATE TABLE calendar_sharing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  shared_with_id UUID NOT NULL REFERENCES users(id),
  permission_level VARCHAR(20) DEFAULT 'view', -- view, edit, manage
  share_all_events BOOLEAN DEFAULT false, -- 모든 일정 공유 여부
  shared_categories JSONB, -- 특정 카테고리만 공유 ['work', 'personal']
  hide_details BOOLEAN DEFAULT false, -- 상세 내용 숨김 (시간만 표시)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(owner_id, shared_with_id)
);

-- 그룹 (친구 그룹) 테이블
CREATE TABLE friend_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  group_name VARCHAR(100) NOT NULL,
  group_color VARCHAR(7), -- HEX color
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 그룹 멤버 테이블
CREATE TABLE friend_group_members (
  group_id UUID NOT NULL REFERENCES friend_groups(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id),
  added_at TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY(group_id, friend_id)
);

-- 인덱스
CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_friends_friend_id ON friends(friend_id);
CREATE INDEX idx_friends_status ON friends(status);
CREATE INDEX idx_calendar_sharing_owner ON calendar_sharing(owner_id);
CREATE INDEX idx_calendar_sharing_shared_with ON calendar_sharing(shared_with_id);