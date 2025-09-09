/**
 * 중앙화된 환경 변수 관리 및 검증
 * 앱 시작 시 필수 환경 변수를 검증합니다.
 */

// 필수 환경 변수 목록
const requiredEnvVars = {
  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Google Gemini AI
  GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
} as const;

// 선택적 환경 변수
const optionalEnvVars = {
  // Toss Payments
  TOSS_CLIENT_KEY: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY,
  TOSS_SECRET_KEY: process.env.TOSS_SECRET_KEY,
  
  // Vercel KV (선택적)
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  
  // Node environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  VERCEL: process.env.VERCEL,
} as const;

// 환경 변수 검증 함수
function validateEnvVars() {
  const missingVars: string[] = [];
  
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missingVars.push(key);
    }
  }
  
  if (missingVars.length > 0) {
    const errorMessage = `
🚨 Missing required environment variables:
${missingVars.map(v => `  - ${v}`).join('\n')}

Please check your .env.local file or Vercel environment settings.
    `.trim();
    
    // 개발 환경에서는 경고만, 프로덕션에서는 에러
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMessage);
    } else {
      console.warn(errorMessage);
    }
  }
  
  // 환경 변수 정보 로깅 (개발 환경에서만)
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Environment variables validated:', {
      required: Object.keys(requiredEnvVars).map(k => 
        requiredEnvVars[k as keyof typeof requiredEnvVars] ? `${k}: ✓` : `${k}: ✗`
      ),
      optional: Object.keys(optionalEnvVars).map(k => 
        optionalEnvVars[k as keyof typeof optionalEnvVars] ? `${k}: ✓` : `${k}: -`
      )
    });
  }
}

// 앱 시작 시 검증 실행
if (typeof window === 'undefined') {
  // 서버 사이드에서만 실행
  validateEnvVars();
}

// 타입 안전한 설정 객체
export const config = {
  google: {
    clientId: requiredEnvVars.GOOGLE_CLIENT_ID!,
    clientSecret: requiredEnvVars.GOOGLE_CLIENT_SECRET!,
    geminiApiKey: requiredEnvVars.GOOGLE_GEMINI_API_KEY!,
    redirectUri: process.env.NODE_ENV === 'production' 
      ? 'https://geulpi-project-10.vercel.app/api/auth/callback'
      : (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'),
  },
  supabase: {
    url: requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: requiredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!,
  },
  toss: {
    clientKey: optionalEnvVars.TOSS_CLIENT_KEY,
    secretKey: optionalEnvVars.TOSS_SECRET_KEY,
  },
  app: {
    env: optionalEnvVars.NODE_ENV as 'development' | 'production' | 'test',
    isProduction: optionalEnvVars.NODE_ENV === 'production',
    isDevelopment: optionalEnvVars.NODE_ENV === 'development',
    isVercel: optionalEnvVars.VERCEL === '1',
    baseUrl: process.env.NODE_ENV === 'production'
      ? 'https://geulpi-project-10.vercel.app'
      : 'http://localhost:3000',
  },
} as const;

// Helper functions
export const isProduction = () => config.app.isProduction;
export const isDevelopment = () => config.app.isDevelopment;
export const getBaseUrl = () => config.app.baseUrl;

export default config;