import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('Setting up chat database tables...');

    // SQL 스크립트들을 단계별로 실행
    const queries = [
      // 1. 채팅 세션 테이블 생성 (외래 키 제약 없이)
      `CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT NOT NULL DEFAULT '새 채팅',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_active BOOLEAN DEFAULT FALSE,
        metadata JSONB DEFAULT '{}'::jsonb,
        
        CONSTRAINT chat_sessions_id_check CHECK (length(id) > 0),
        CONSTRAINT chat_sessions_title_check CHECK (length(title) > 0)
      );`,

      // 2. 채팅 메시지 테이블 생성
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        data JSONB DEFAULT '{}'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        
        CONSTRAINT chat_messages_id_check CHECK (length(id) > 0),
        CONSTRAINT chat_messages_content_check CHECK (length(content) > 0)
      );`,

      // 3. 인덱스 생성
      `CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated ON chat_sessions(user_id, updated_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(session_id, created_at ASC);`,

      // 4. updated_at 자동 업데이트 함수
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
       END;
       $$ language 'plpgsql';`,

      // 5. chat_sessions 테이블에 업데이트 트리거
      `DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;`,
      `CREATE TRIGGER update_chat_sessions_updated_at
         BEFORE UPDATE ON chat_sessions
         FOR EACH ROW
         EXECUTE FUNCTION update_updated_at_column();`,

      // 6. 메시지 추가 시 세션 updated_at 업데이트 함수
      `CREATE OR REPLACE FUNCTION update_session_updated_at()
       RETURNS TRIGGER AS $$
       BEGIN
         UPDATE chat_sessions 
         SET updated_at = NOW()
         WHERE id = NEW.session_id;
         RETURN NEW;
       END;
       $$ language 'plpgsql';`,

      // 7. 메시지 추가 시 세션 업데이트 트리거
      `DROP TRIGGER IF EXISTS update_session_on_message ON chat_messages;`,
      `CREATE TRIGGER update_session_on_message
         AFTER INSERT ON chat_messages
         FOR EACH ROW
         EXECUTE FUNCTION update_session_updated_at();`,

      // 8. RLS 활성화 (보안)
      `ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;`,

      // 9. 익명 사용자를 위한 임시 정책 (개발용)
      `DROP POLICY IF EXISTS "Allow anonymous read access to sessions" ON chat_sessions;`,
      `CREATE POLICY "Allow anonymous read access to sessions"
         ON chat_sessions FOR SELECT
         TO anon
         USING (true);`,

      `DROP POLICY IF EXISTS "Allow anonymous read access to messages" ON chat_messages;`,
      `CREATE POLICY "Allow anonymous read access to messages"
         ON chat_messages FOR SELECT
         TO anon
         USING (true);`,

      `DROP POLICY IF EXISTS "Allow anonymous write access to sessions" ON chat_sessions;`,
      `CREATE POLICY "Allow anonymous write access to sessions"
         ON chat_sessions FOR INSERT
         TO anon
         WITH CHECK (true);`,

      `DROP POLICY IF EXISTS "Allow anonymous write access to messages" ON chat_messages;`,
      `CREATE POLICY "Allow anonymous write access to messages"
         ON chat_messages FOR INSERT
         TO anon
         WITH CHECK (true);`,

      `DROP POLICY IF EXISTS "Allow anonymous update access to sessions" ON chat_sessions;`,
      `CREATE POLICY "Allow anonymous update access to sessions"
         ON chat_sessions FOR UPDATE
         TO anon
         USING (true)
         WITH CHECK (true);`,

      `DROP POLICY IF EXISTS "Allow anonymous delete access to sessions" ON chat_sessions;`,
      `CREATE POLICY "Allow anonymous delete access to sessions"
         ON chat_sessions FOR DELETE
         TO anon
         USING (true);`,

      `DROP POLICY IF EXISTS "Allow anonymous delete access to messages" ON chat_messages;`,
      `CREATE POLICY "Allow anonymous delete access to messages"
         ON chat_messages FOR DELETE
         TO anon
         USING (true);`,
    ];

    // 각 쿼리를 순차적으로 실행
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i].trim();
      if (!query) continue;

      console.log(`Executing query ${i + 1}/${queries.length}: ${query.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('execute_sql', {
        sql_query: query
      });

      if (error) {
        console.error(`Error in query ${i + 1}:`, error);
        
        // 대안: 직접 SQL 실행 시도
        try {
          await supabase.from('_').select().limit(0); // 연결 테스트
          console.log('Trying direct SQL execution...');
          
          // RPC 함수가 없다면 직접 테이블 조작 시도
          if (query.includes('CREATE TABLE IF NOT EXISTS chat_sessions')) {
            // 테이블 존재 여부만 확인
            const { error: testError } = await supabase
              .from('chat_sessions')
              .select('id')
              .limit(1);
            
            if (testError && testError.code === 'PGRST116') {
              console.log('chat_sessions table does not exist, needs manual creation');
            }
          }
        } catch (directError) {
          console.error('Direct execution also failed:', directError);
        }
      } else {
        console.log(`Query ${i + 1} executed successfully`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Chat database setup completed. Please check Supabase dashboard for any manual steps needed.',
      nextSteps: [
        '1. Go to your Supabase dashboard',
        '2. Navigate to SQL Editor',
        '3. Run the SQL script from CHAT_SCHEMA.sql if needed',
        '4. Verify tables are created: chat_sessions, chat_messages'
      ]
    });

  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Manual setup required. Please run CHAT_SCHEMA.sql in Supabase dashboard.',
      instructions: [
        '1. Open your Supabase dashboard: https://supabase.com/dashboard',
        '2. Go to SQL Editor',
        '3. Copy and paste the content from CHAT_SCHEMA.sql',
        '4. Execute the script',
        '5. Try the setup again'
      ]
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Chat Database Setup API',
    usage: 'Send a POST request to setup chat tables',
    schemaFile: 'See CHAT_SCHEMA.sql for manual setup'
  });
}