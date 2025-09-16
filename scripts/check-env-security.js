/**
 * 환경 변수 보안 검사 스크립트
 * .env 파일의 보안 설정을 검증하고 개선 사항을 제안합니다.
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// 색상 코드 for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// 보안 검사 항목
const securityChecks = {
  // 1. JWT_SECRET 검사
  checkJwtSecret: (envVars) => {
    const jwtSecret = envVars.JWT_SECRET;
    const issues = [];

    if (!jwtSecret) {
      issues.push({ severity: 'critical', message: 'JWT_SECRET이 설정되지 않았습니다.' });
      return issues;
    }

    if (jwtSecret === 'your-secret-key-change-in-production') {
      issues.push({ severity: 'critical', message: 'JWT_SECRET이 기본값입니다. 변경 필수!' });
    }

    if (jwtSecret.length < 32) {
      issues.push({ severity: 'high', message: 'JWT_SECRET이 너무 짧습니다. 최소 32자 이상 권장.' });
    }

    // 엔트로피 체크
    const entropy = calculateEntropy(jwtSecret);
    if (entropy < 4) {
      issues.push({ severity: 'medium', message: `JWT_SECRET의 엔트로피가 낮습니다 (${entropy.toFixed(2)}). 더 복잡한 값 사용 권장.` });
    }

    return issues;
  },

  // 2. Database URL 검사
  checkDatabaseUrls: (envVars) => {
    const issues = [];
    const dbUrl = envVars.DATABASE_URL;
    const directUrl = envVars.DIRECT_DATABASE_URL;

    if (!dbUrl) {
      issues.push({ severity: 'critical', message: 'DATABASE_URL이 설정되지 않았습니다.' });
    }

    if (dbUrl && dbUrl.includes('password=') && dbUrl.includes('public-password')) {
      issues.push({ severity: 'high', message: 'DATABASE_URL에 기본 비밀번호가 포함되어 있습니다.' });
    }

    if (dbUrl && !dbUrl.includes('sslmode=require')) {
      issues.push({ severity: 'medium', message: 'DATABASE_URL에 SSL 모드가 설정되지 않았습니다.' });
    }

    return issues;
  },

  // 3. Supabase 키 검사
  checkSupabaseKeys: (envVars) => {
    const issues = [];
    const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

    if (anonKey && serviceKey && anonKey === serviceKey) {
      issues.push({ severity: 'critical', message: 'Anon Key와 Service Role Key가 동일합니다!' });
    }

    if (serviceKey && envVars.NODE_ENV === 'production') {
      issues.push({ severity: 'warning', message: 'Production에서 Service Role Key 사용 주의 필요' });
    }

    return issues;
  },

  // 4. Google OAuth 키 검사
  checkGoogleOAuth: (envVars) => {
    const issues = [];
    const clientId = envVars.GOOGLE_CLIENT_ID;
    const clientSecret = envVars.GOOGLE_CLIENT_SECRET;

    if (clientId && clientId.includes('example')) {
      issues.push({ severity: 'high', message: 'GOOGLE_CLIENT_ID가 예제 값입니다.' });
    }

    if (clientSecret && clientSecret.length < 20) {
      issues.push({ severity: 'medium', message: 'GOOGLE_CLIENT_SECRET이 비정상적으로 짧습니다.' });
    }

    return issues;
  },

  // 5. 기타 보안 설정 검사
  checkMiscSecurity: (envVars) => {
    const issues = [];

    // NODE_ENV 검사
    if (!envVars.NODE_ENV) {
      issues.push({ severity: 'medium', message: 'NODE_ENV가 설정되지 않았습니다.' });
    }

    // 디버그 모드 검사
    if (envVars.DEBUG === 'true' && envVars.NODE_ENV === 'production') {
      issues.push({ severity: 'high', message: 'Production에서 DEBUG 모드가 활성화되어 있습니다.' });
    }

    // API 키 노출 검사
    Object.keys(envVars).forEach(key => {
      if (key.includes('SECRET') || key.includes('PRIVATE')) {
        if (key.startsWith('NEXT_PUBLIC_')) {
          issues.push({ severity: 'critical', message: `${key}가 클라이언트에 노출됩니다!` });
        }
      }
    });

    return issues;
  }
};

// 엔트로피 계산 함수
function calculateEntropy(str) {
  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

// 강력한 시크릿 생성 함수
function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('base64');
}

// .env 파일 읽기
function readEnvFile() {
  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    console.log(`${colors.red}❌ .env 파일을 찾을 수 없습니다.${colors.reset}`);
    return null;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      envVars[key.trim()] = valueParts.join('=').trim().replace(/["']/g, '');
    }
  });

  return envVars;
}

// 메인 실행 함수
function main() {
  console.log(`\n${colors.cyan}🔍 환경 변수 보안 검사 시작...${colors.reset}\n`);
  console.log('=' .repeat(50));

  const envVars = readEnvFile();
  if (!envVars) {
    return;
  }

  let totalIssues = {
    critical: 0,
    high: 0,
    medium: 0,
    warning: 0
  };

  // 모든 보안 검사 실행
  Object.entries(securityChecks).forEach(([checkName, checkFunc]) => {
    const issues = checkFunc(envVars);

    if (issues.length > 0) {
      console.log(`\n${colors.yellow}📋 ${checkName}:${colors.reset}`);
      issues.forEach(issue => {
        let icon, color;
        switch(issue.severity) {
          case 'critical':
            icon = '🚨'; color = colors.red;
            totalIssues.critical++;
            break;
          case 'high':
            icon = '⚠️'; color = colors.magenta;
            totalIssues.high++;
            break;
          case 'medium':
            icon = '⚡'; color = colors.yellow;
            totalIssues.medium++;
            break;
          default:
            icon = '💡'; color = colors.blue;
            totalIssues.warning++;
        }
        console.log(`  ${icon} ${color}${issue.message}${colors.reset}`);
      });
    }
  });

  // 결과 요약
  console.log('\n' + '=' .repeat(50));
  console.log(`\n${colors.cyan}📊 검사 결과 요약:${colors.reset}`);
  console.log(`  🚨 치명적: ${totalIssues.critical}`);
  console.log(`  ⚠️  높음: ${totalIssues.high}`);
  console.log(`  ⚡ 보통: ${totalIssues.medium}`);
  console.log(`  💡 경고: ${totalIssues.warning}`);

  // 개선 제안
  if (totalIssues.critical > 0 || totalIssues.high > 0) {
    console.log(`\n${colors.green}✅ 권장 조치:${colors.reset}`);
    console.log('  1. 새로운 JWT_SECRET 생성:');
    console.log(`     ${colors.cyan}JWT_SECRET="${generateSecureSecret(32)}"${colors.reset}`);
    console.log('  2. .env.example 파일 업데이트 (실제 값 제외)');
    console.log('  3. 모든 팀원에게 환경 변수 업데이트 공유');
    console.log('  4. Production 환경 변수 별도 관리');
  }

  // .env.example 파일 생성 제안
  console.log(`\n${colors.blue}💡 .env.example 파일 생성을 권장합니다.${colors.reset}`);

  const score = calculateSecurityScore(totalIssues);
  console.log(`\n${colors.cyan}🎯 보안 점수: ${score}/100${colors.reset}`);

  if (score < 60) {
    console.log(`${colors.red}⚠️  즉시 조치가 필요합니다!${colors.reset}`);
    process.exit(1);
  } else if (score < 80) {
    console.log(`${colors.yellow}📈 개선이 필요합니다.${colors.reset}`);
  } else {
    console.log(`${colors.green}✨ 양호한 상태입니다.${colors.reset}`);
  }
}

// 보안 점수 계산
function calculateSecurityScore(issues) {
  const baseScore = 100;
  const penalties = {
    critical: 20,
    high: 10,
    medium: 5,
    warning: 2
  };

  let score = baseScore;
  score -= issues.critical * penalties.critical;
  score -= issues.high * penalties.high;
  score -= issues.medium * penalties.medium;
  score -= issues.warning * penalties.warning;

  return Math.max(0, score);
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { securityChecks, generateSecureSecret };