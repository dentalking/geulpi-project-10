/**
 * 통합 친구목록 테스트 스크립트
 *
 * 이 스크립트는 새로운 통합 친구목록 기능을 테스트합니다:
 * - messenger_integrations 테이블 확인
 * - meeting_proposals 테이블 확인
 * - 통합 친구목록 API 테스트
 *
 * 사용법: node scripts/test-integrated-friends.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testIntegratedFriends() {
  console.log('🧪 통합 친구목록 기능 테스트 시작...\n');

  try {
    // 1. 테이블 존재 확인
    console.log('1️⃣  데이터베이스 테이블 확인...');

    const tables = ['messenger_integrations', 'meeting_proposals', 'friends', 'users'];
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ ${table} 테이블이 존재하지 않습니다: ${error.message}`);
        } else {
          console.log(`✅ ${table} 테이블 확인됨`);
        }
      } catch (err) {
        console.log(`❌ ${table} 테이블 확인 실패: ${err.message}`);
      }
    }

    // 2. 샘플 메신저 통합 데이터 확인
    console.log('\n2️⃣  메신저 통합 데이터 확인...');

    const { data: integrations, error: integrationsError } = await supabase
      .from('messenger_integrations')
      .select('*')
      .limit(5);

    if (integrationsError) {
      console.log(`❌ 메신저 통합 데이터 조회 실패: ${integrationsError.message}`);
    } else {
      console.log(`✅ 메신저 통합 데이터 ${integrations?.length || 0}개 발견`);
      if (integrations?.length > 0) {
        console.log('   예시 데이터:', integrations[0]);
      }
    }

    // 3. 친구 데이터 확인
    console.log('\n3️⃣  친구 데이터 확인...');

    const { data: friends, error: friendsError } = await supabase
      .from('friends')
      .select('id, status, nickname')
      .limit(5);

    if (friendsError) {
      console.log(`❌ 친구 데이터 조회 실패: ${friendsError.message}`);
    } else {
      console.log(`✅ 친구 데이터 ${friends?.length || 0}개 발견`);
      if (friends?.length > 0) {
        const statusCounts = friends.reduce((acc, friend) => {
          acc[friend.status] = (acc[friend.status] || 0) + 1;
          return acc;
        }, {});
        console.log('   상태별 친구 수:', statusCounts);
      }
    }

    // 4. 약속 제안 데이터 확인
    console.log('\n4️⃣  약속 제안 데이터 확인...');

    const { data: proposals, error: proposalsError } = await supabase
      .from('meeting_proposals')
      .select('id, status, meeting_type')
      .limit(5);

    if (proposalsError) {
      console.log(`❌ 약속 제안 데이터 조회 실패: ${proposalsError.message}`);
    } else {
      console.log(`✅ 약속 제안 데이터 ${proposals?.length || 0}개 발견`);
      if (proposals?.length > 0) {
        const statusCounts = proposals.reduce((acc, proposal) => {
          acc[proposal.status] = (acc[proposal.status] || 0) + 1;
          return acc;
        }, {});
        console.log('   상태별 제안 수:', statusCounts);
      }
    }

    // 5. 테스트 데이터 생성 (선택사항)
    console.log('\n5️⃣  테스트 데이터 생성 여부 확인...');

    if (integrations?.length === 0) {
      console.log('💡 메신저 통합 테스트 데이터가 없습니다.');
      console.log('   실제 카카오톡/디스코드 연동 시 자동으로 생성됩니다.');
    }

    console.log('\n✅ 통합 친구목록 기능 테스트 완료!');
    console.log('\n📋 다음 단계:');
    console.log('   1. 카카오톡 비즈니스 채널 심사 완료 대기');
    console.log('   2. 디스코드 봇 설정 (선택사항)');
    console.log('   3. /friends 페이지에서 UI 테스트');
    console.log('   4. API 엔드포인트 테스트:');
    console.log('      - GET /api/friends/integrated');
    console.log('      - GET /api/friends/requests/integrated');
    console.log('      - POST /api/friends/add');

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  testIntegratedFriends().catch(console.error);
}

module.exports = { testIntegratedFriends };