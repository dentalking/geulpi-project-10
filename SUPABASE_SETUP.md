# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 접속
2. "Start your project" 클릭
3. GitHub로 로그인
4. "New Project" 클릭
5. 프로젝트 설정:
   - **Project Name**: geulpi-calendar
   - **Database Password**: 안전한 비밀번호 설정 (저장해두세요!)
   - **Region**: Northeast Asia (Seoul) - ap-northeast-2
6. "Create Project" 클릭 (생성에 약 2분 소요)

## 2. 환경 변수 가져오기

프로젝트가 생성되면:

1. **Settings** > **API** 메뉴로 이동
2. 다음 값들을 복사:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGciOiJI...` (긴 문자열)
   - **service_role**: `eyJhbGciOiJI...` (긴 문자열, secret)

## 3. 데이터베이스 스키마 설정

1. Supabase Dashboard에서 **SQL Editor** 클릭
2. "New Query" 클릭
3. 아래 SQL 복사하여 실행:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

## 4. Vercel 환경 변수 설정

1. Vercel Dashboard 접속
2. 프로젝트 선택
3. **Settings** > **Environment Variables**
4. 다음 변수들 추가:

```
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
JWT_SECRET=<generate_random_string>
```

## 5. 로컬 환경 변수 설정

`.env.local` 파일 생성:

```bash
cp .env.example .env.local
```

파일 편집하여 위의 값들 입력

## 6. 테스트

```bash
npm run dev
```

- 회원가입 테스트: http://localhost:3000/register
- 로그인 테스트: http://localhost:3000/login

## 문제 해결

### CORS 에러 발생 시
Supabase Dashboard > Authentication > URL Configuration에서:
- Site URL: `https://your-vercel-app.vercel.app`
- Redirect URLs: 
  - `http://localhost:3000/*`
  - `https://your-vercel-app.vercel.app/*`

### 데이터베이스 연결 실패
- Service Role Key가 올바른지 확인
- Supabase 프로젝트가 active 상태인지 확인
- 네트워크/방화벽 설정 확인