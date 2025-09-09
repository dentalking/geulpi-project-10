# 🚀 즉시 적용 가능한 안정화 개선사항

## 1️⃣ 에러 처리 개선 (30분)

### Before:
```typescript
// ❌ 기존 코드
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ... 작업
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
```

### After:
```typescript
// ✅ 개선된 코드
import { successResponse, errorResponse, ApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ... 작업
    return successResponse(data);
  } catch (error) {
    return errorResponse(error instanceof ApiError ? error : new Error('Internal error'));
  }
}
```

## 2️⃣ Rate Limiting 추가 (10분)

### AI Chat API에 적용:
```typescript
// src/app/api/ai/chat/route.ts
import { checkRateLimit } from '@/middleware/rateLimiter';

export async function POST(request: NextRequest) {
  // Rate limiting 체크 추가
  const rateLimitResponse = await checkRateLimit(request, 'ai');
  if (rateLimitResponse) return rateLimitResponse;
  
  // 기존 로직...
}
```

## 3️⃣ 환경 변수 검증 (15분)

### src/lib/config.ts 생성:
```typescript
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_GEMINI_API_KEY'
];

// 앱 시작 시 검증
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

export const config = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    geminiApiKey: process.env.GOOGLE_GEMINI_API_KEY!,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }
};
```

## 4️⃣ 입력 검증 강화 (20분)

### 설치:
```bash
npm install zod isomorphic-dompurify
```

### 사용 예시:
```typescript
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

const chatInputSchema = z.object({
  message: z.string()
    .min(1, 'Message is required')
    .max(5000, 'Message too long')
    .transform(val => DOMPurify.sanitize(val)),
  sessionId: z.string().optional(),
});

// API 라우트에서
const validation = chatInputSchema.safeParse(body);
if (!validation.success) {
  return errorResponse(
    new ApiError(400, 'INVALID_INPUT', validation.error.message)
  );
}
```

## 5️⃣ 보안 헤더 추가 (5분)

### next.config.js 수정:
```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

## 6️⃣ 로깅 개선 (20분)

### Simple Logger 구현:
```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class SimpleLogger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  
  private log(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (this.isDevelopment) {
      console.log(formatted, ...args);
    } else {
      // 프로덕션에서는 에러만 로깅
      if (level === 'error') {
        console.error(formatted, ...args);
        // TODO: Sentry나 외부 로깅 서비스로 전송
      }
    }
  }
  
  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }
  
  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }
  
  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }
  
  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }
}

export const logger = new SimpleLogger();
```

### console.log 일괄 변경:
```bash
# VSCode에서 Find & Replace (Cmd/Ctrl + Shift + H)
# Find: console\.log\(
# Replace: logger.info(

# Find: console\.error\(
# Replace: logger.error(
```

## 7️⃣ 타입 안정성 강화 (10분)

### tsconfig.json 수정:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## 8️⃣ 기본 Health Check 추가 (5분)

### src/app/api/health/route.ts:
```typescript
import { successResponse } from '@/lib/api-response';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'operational',
      database: 'checking...',
    }
  };
  
  // Database 연결 체크
  try {
    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .select('count')
      .limit(1);
    
    health.services.database = error ? 'degraded' : 'operational';
  } catch {
    health.services.database = 'down';
    health.status = 'degraded';
  }
  
  return successResponse(health);
}
```

## 9️⃣ 에러 바운더리 추가 (10분)

### src/components/ErrorBoundary.tsx:
```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // TODO: Send to error tracking service
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### Layout에 적용:
```typescript
// src/app/[locale]/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Layout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
```

## 🎯 적용 순서 (우선순위)

1. **보안 헤더 추가** (5분) - 즉시 보안 강화
2. **에러 처리 표준화** (30분) - 디버깅 개선
3. **Rate Limiting** (10분) - DDoS 방어
4. **입력 검증** (20분) - XSS/Injection 방어
5. **환경 변수 검증** (15분) - 설정 오류 방지
6. **로깅 개선** (20분) - 모니터링 기반
7. **Health Check** (5분) - 상태 모니터링
8. **에러 바운더리** (10분) - UX 개선
9. **타입 안정성** (10분) - 컴파일 타임 에러 감지

**총 소요 시간: 약 2시간**

## 📝 체크리스트

- [ ] api-response.ts 생성
- [ ] rateLimiter.ts 생성
- [ ] config.ts 생성 및 환경 변수 검증
- [ ] zod 설치 및 입력 검증 적용
- [ ] next.config.js에 보안 헤더 추가
- [ ] logger.ts 생성 및 console.log 대체
- [ ] tsconfig.json strict 모드 활성화
- [ ] health check API 추가
- [ ] ErrorBoundary 컴포넌트 추가

## 🚨 주의사항

1. **단계적 적용**: 한 번에 모든 변경을 하지 말고 단계적으로 적용
2. **테스트**: 각 변경 후 기능 테스트 필수
3. **모니터링**: 변경 후 에러 로그 모니터링
4. **롤백 준비**: 문제 발생 시 즉시 롤백할 수 있도록 준비

---

*이 가이드를 따라 2시간 내에 서비스 안정성을 크게 향상시킬 수 있습니다.*