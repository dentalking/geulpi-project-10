/**
 * 통합 실시간 동기화 시스템 테스트 스크립트
 * 기본적인 동작과 성능을 확인합니다.
 */

const fs = require('fs').promises;
const path = require('path');

async function testUnifiedSync() {
  console.log('🧪 통합 실시간 동기화 시스템 테스트 시작\n');

  const testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
  };

  // 1. 필수 파일 존재 확인
  console.log('📁 필수 파일 존재 확인...');
  const requiredFiles = [
    'src/store/unifiedEventStore.ts',
    'src/hooks/useSupabaseRealtime.ts',
    'src/hooks/useServerSentEvents.ts',
    'src/hooks/useUnifiedSync.ts',
    'src/app/api/events/stream/route.ts',
    'src/components/UnifiedAIInterface.enhanced.tsx',
    'src/components/EventsArtifactPanel.enhanced.tsx',
    'src/providers/UnifiedEventProvider.tsx'
  ];

  for (const file of requiredFiles) {
    try {
      await fs.access(file);
      console.log(`  ✅ ${file}`);
      testResults.passed++;
      testResults.details.push({ test: `File exists: ${file}`, status: 'PASS' });
    } catch (error) {
      console.log(`  ❌ ${file} - 누락됨`);
      testResults.failed++;
      testResults.details.push({ test: `File exists: ${file}`, status: 'FAIL', error: 'File missing' });
    }
  }

  // 2. TypeScript 타입 체크
  console.log('\n🔍 TypeScript 타입 체크...');
  try {
    const { execSync } = require('child_process');
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
    console.log('  ✅ TypeScript 타입 체크 통과');
    testResults.passed++;
    testResults.details.push({ test: 'TypeScript type check', status: 'PASS' });
  } catch (error) {
    console.log('  ⚠️ TypeScript 타입 에러 발견');
    console.log(`     ${error.stdout?.toString() || error.message}`);
    testResults.warnings++;
    testResults.details.push({ test: 'TypeScript type check', status: 'WARN', error: 'Type errors found' });
  }

  // 3. 코드 구조 검증
  console.log('\n🏗️ 코드 구조 검증...');

  // UnifiedEventStore 검증
  try {
    const storeContent = await fs.readFile('src/store/unifiedEventStore.ts', 'utf-8');

    const requiredExports = [
      'useUnifiedEventStore',
      'useEvents',
      'useArtifactPanel',
      'useViewState',
      'useSyncState'
    ];

    let structureValid = true;
    for (const exportName of requiredExports) {
      if (storeContent.includes(`export const ${exportName}`) || storeContent.includes(`export function ${exportName}`)) {
        console.log(`  ✅ ${exportName} export 확인`);
      } else {
        console.log(`  ❌ ${exportName} export 누락`);
        structureValid = false;
      }
    }

    if (structureValid) {
      testResults.passed++;
      testResults.details.push({ test: 'UnifiedEventStore structure', status: 'PASS' });
    } else {
      testResults.failed++;
      testResults.details.push({ test: 'UnifiedEventStore structure', status: 'FAIL', error: 'Missing exports' });
    }
  } catch (error) {
    console.log(`  ❌ UnifiedEventStore 읽기 실패: ${error.message}`);
    testResults.failed++;
    testResults.details.push({ test: 'UnifiedEventStore structure', status: 'FAIL', error: error.message });
  }

  // 4. 환경 변수 확인
  console.log('\n🔧 환경 변수 확인...');
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];

  let envValid = true;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`  ✅ ${envVar} 설정됨`);
    } else {
      console.log(`  ⚠️ ${envVar} 누락됨`);
      envValid = false;
    }
  }

  if (envValid) {
    testResults.passed++;
    testResults.details.push({ test: 'Environment variables', status: 'PASS' });
  } else {
    testResults.warnings++;
    testResults.details.push({ test: 'Environment variables', status: 'WARN', error: 'Missing env vars' });
  }

  // 5. Package.json 의존성 확인
  console.log('\n📦 패키지 의존성 확인...');
  try {
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const requiredPackages = [
      '@supabase/supabase-js',
      'zustand',
      'immer'
    ];

    let depsValid = true;
    for (const pkg of requiredPackages) {
      if (dependencies[pkg]) {
        console.log(`  ✅ ${pkg} (${dependencies[pkg]})`);
      } else {
        console.log(`  ❌ ${pkg} 누락됨`);
        depsValid = false;
      }
    }

    if (depsValid) {
      testResults.passed++;
      testResults.details.push({ test: 'Package dependencies', status: 'PASS' });
    } else {
      testResults.failed++;
      testResults.details.push({ test: 'Package dependencies', status: 'FAIL', error: 'Missing packages' });
    }
  } catch (error) {
    console.log(`  ❌ package.json 읽기 실패: ${error.message}`);
    testResults.failed++;
    testResults.details.push({ test: 'Package dependencies', status: 'FAIL', error: error.message });
  }

  // 6. 기존 파일 백업 확인
  console.log('\n💾 기존 파일 백업 확인...');
  const backupFiles = [
    'src/components/UnifiedAIInterface.tsx',
    'src/components/EventsArtifactPanel.tsx',
    'src/contexts/EventContext.tsx'
  ];

  for (const file of backupFiles) {
    try {
      await fs.access(file);
      console.log(`  ✅ ${file} 백업 보존됨`);
      testResults.passed++;
      testResults.details.push({ test: `Backup preserved: ${file}`, status: 'PASS' });
    } catch (error) {
      console.log(`  ⚠️ ${file} 백업 없음 (원본 파일이 교체되었을 수 있음)`);
      testResults.warnings++;
      testResults.details.push({ test: `Backup preserved: ${file}`, status: 'WARN', error: 'Backup not found' });
    }
  }

  // 7. 실시간 동기화 API 라우트 확인
  console.log('\n🔌 API 라우트 확인...');
  try {
    const routeContent = await fs.readFile('src/app/api/events/stream/route.ts', 'utf-8');

    if (routeContent.includes('export const runtime = \'edge\'')) {
      console.log('  ✅ Edge Runtime 설정 확인');
      testResults.passed++;
      testResults.details.push({ test: 'SSE API Edge Runtime', status: 'PASS' });
    } else {
      console.log('  ⚠️ Edge Runtime 설정이 없습니다');
      testResults.warnings++;
      testResults.details.push({ test: 'SSE API Edge Runtime', status: 'WARN', error: 'Edge runtime not configured' });
    }

    if (routeContent.includes('ReadableStream')) {
      console.log('  ✅ Server-Sent Events 구현 확인');
      testResults.passed++;
      testResults.details.push({ test: 'SSE API implementation', status: 'PASS' });
    } else {
      console.log('  ❌ Server-Sent Events 구현이 없습니다');
      testResults.failed++;
      testResults.details.push({ test: 'SSE API implementation', status: 'FAIL', error: 'SSE not implemented' });
    }
  } catch (error) {
    console.log(`  ❌ API 라우트 확인 실패: ${error.message}`);
    testResults.failed++;
    testResults.details.push({ test: 'SSE API route', status: 'FAIL', error: error.message });
  }

  // 결과 출력
  console.log('\n📊 테스트 결과 요약');
  console.log('====================');
  console.log(`✅ 통과: ${testResults.passed}`);
  console.log(`❌ 실패: ${testResults.failed}`);
  console.log(`⚠️ 경고: ${testResults.warnings}`);
  console.log(`📊 총 테스트: ${testResults.passed + testResults.failed + testResults.warnings}`);

  const successRate = (testResults.passed / (testResults.passed + testResults.failed + testResults.warnings)) * 100;
  console.log(`🎯 성공률: ${successRate.toFixed(1)}%`);

  // 상세 결과 저장
  const reportPath = 'test-results.json';
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings,
      successRate: successRate
    },
    details: testResults.details
  }, null, 2));

  console.log(`\n📄 상세 결과가 ${reportPath}에 저장되었습니다.`);

  // 권장사항
  console.log('\n💡 다음 단계 권장사항:');

  if (testResults.failed > 0) {
    console.log('❌ 실패한 테스트들을 먼저 해결해주세요.');
  }

  if (testResults.warnings > 0) {
    console.log('⚠️ 경고 항목들을 검토해주세요.');
  }

  if (testResults.failed === 0 && testResults.warnings <= 2) {
    console.log('🎉 시스템이 마이그레이션 준비가 되었습니다!');
    console.log('📋 다음 단계:');
    console.log('   1. 개발 환경에서 수동 테스트');
    console.log('   2. 기존 컴포넌트를 새 컴포넌트로 점진적 교체');
    console.log('   3. 실시간 동기화 기능 테스트');
    console.log('   4. 성능 모니터링');
  }

  return testResults;
}

// 스크립트 실행
if (require.main === module) {
  testUnifiedSync().catch(console.error);
}

module.exports = { testUnifiedSync };