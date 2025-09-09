# 데이터베이스 스키마 의존성 분석

## 현재 테이블 구조

### 1. 인증 관련
- **users** (custom table in 001_create_users_table.sql)
  - id: UUID PRIMARY KEY
  - email: TEXT UNIQUE NOT NULL
  - password: TEXT NOT NULL
  - name: TEXT
  - created_at, updated_at: TIMESTAMP

### 2. 사용자 프로필
- **user_profiles** (20240908_create_user_profiles.sql)
  - user_id: UUID → **auth.users(id)** ⚠️ (불일치)
  - 개인정보, 위치정보, 일정 선호도 등

### 3. 친구 관계
- **friends** (friends-schema.sql)
  - user_id: UUID → **users(id)**
  - friend_id: UUID → **users(id)**
  - status, relationship_type, nickname 등

- **friend_invitations** (friends-schema.sql)
  - inviter_id: UUID → **users(id)**
  - invitee_email: VARCHAR(255)

- **friend_groups** (friends-schema.sql)
  - user_id: UUID → **users(id)**
  
- **friend_group_members** (friends-schema.sql)
  - group_id: UUID → **friend_groups(id)**
  - friend_id: UUID → **users(id)**

### 4. 캘린더 공유
- **calendar_sharing** (friends-schema.sql)
  - owner_id: UUID → **users(id)**
  - shared_with_id: UUID → **users(id)**

### 5. 채팅
- **chat_sessions** (CHAT_SCHEMA_FIXED.sql)
  - user_id: TEXT ⚠️ (외래키 없음)
  
- **chat_messages** (CHAT_SCHEMA_FIXED.sql)
  - session_id: TEXT → **chat_sessions(id)**

## 발견된 문제점

### 🔴 Critical Issues
1. **참조 불일치**: user_profiles가 auth.users를 참조하지만, 다른 테이블들은 custom users 테이블 참조
2. **타입 불일치**: chat_sessions.user_id가 TEXT (다른 테이블은 UUID)
3. **외래키 누락**: chat_sessions.user_id에 외래키 제약 없음

### 🟡 Warnings
1. **중복 함수**: update_updated_at_column() 여러 파일에 중복 정의
2. **RLS 불일치**: 일부 테이블만 RLS 적용, chat 테이블은 모든 사용자 접근 허용

### 🟢 Improvements
1. **인덱스 최적화**: 복합 인덱스 추가 필요
2. **JSONB 인덱싱**: GIN 인덱스 고려

## 해결 전략

### Phase 1: 인증 통합
- Supabase auth.users를 기본으로 사용
- custom users 테이블 제거 또는 auth.users와 1:1 매핑

### Phase 2: 타입 정합성
- 모든 user_id를 UUID로 통일
- chat_sessions 테이블 재설계

### Phase 3: RLS 정책
- 모든 테이블에 일관된 RLS 정책 적용
- 개발/프로덕션 환경 분리

### Phase 4: 성능 최적화
- 필요한 인덱스 추가
- JSONB 필드 최적화