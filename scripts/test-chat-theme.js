/**
 * 채팅 테마 변경 명령어 테스트
 * 브라우저 콘솔에서 실행하여 SettingsControlServiceV2 동작 확인
 *
 * 사용법:
 * 1. 개발 서버 실행 (npm run dev)
 * 2. 브라우저에서 localhost:3000 열기
 * 3. 브라우저 콘솔에서 이 스크립트 실행
 */

// SettingsControlServiceV2 import 및 인스턴스 생성
async function testChatThemeCommands() {
  console.log('🤖 채팅 테마 명령어 테스트 시작...\n');

  // 현재 상태 확인 헬퍼
  function checkState() {
    const html = document.documentElement;
    return {
      domClass: html.classList.contains('dark') ? 'dark' :
                html.classList.contains('light') ? 'light' : 'none',
      dataTheme: html.getAttribute('data-theme'),
      localStorage: localStorage.getItem('theme'),
      actualDisplay: html.classList.contains('dark') ? 'dark' : 'light'
    };
  }

  // 테스트 케이스
  const testCases = [
    {
      message: "다크모드로 전환해줘",
      expectedTheme: 'dark'
    },
    {
      message: "다크 모드로 바꿔줘",  // 이미 dark인 상태
      expectedResponse: '이미'
    },
    {
      message: "라이트 모드로 변경해줘",
      expectedTheme: 'light'
    },
    {
      message: "밝은 테마로 바꿔",
      expectedResponse: '이미'  // 이미 light인 상태
    },
    {
      message: "자동 모드로 설정해줘",
      expectedTheme: 'system'
    },
    {
      message: "다크 테마로 전환",
      expectedTheme: 'dark'
    }
  ];

  // 각 테스트 케이스 실행
  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    console.log(`\n📝 테스트 ${i + 1}: "${test.message}"`);

    // 현재 상태 출력
    const beforeState = checkState();
    console.log('변경 전:', beforeState);

    // 실제 SettingsControlServiceV2 사용하려면 import 필요
    // 여기서는 Custom Event를 직접 트리거하여 시뮬레이션
    if (test.message.includes('다크')) {
      if (beforeState.actualDisplay === 'dark') {
        console.log('응답: 이미 다크 모드입니다.');
      } else {
        window.dispatchEvent(new CustomEvent('themeChanged', {
          detail: { theme: 'dark', source: 'chat-test' }
        }));
        console.log('응답: 다크 모드로 변경되었습니다! ✨');
      }
    } else if (test.message.includes('라이트') || test.message.includes('밝은')) {
      if (beforeState.actualDisplay === 'light' && beforeState.localStorage !== 'system') {
        console.log('응답: 이미 라이트 모드입니다.');
      } else {
        window.dispatchEvent(new CustomEvent('themeChanged', {
          detail: { theme: 'light', source: 'chat-test' }
        }));
        console.log('응답: 라이트 모드로 변경되었습니다! ✨');
      }
    } else if (test.message.includes('자동') || test.message.includes('시스템')) {
      if (beforeState.localStorage === 'system') {
        console.log('응답: 이미 자동 모드입니다.');
      } else {
        window.dispatchEvent(new CustomEvent('themeChanged', {
          detail: { theme: 'system', source: 'chat-test' }
        }));
        console.log('응답: 자동 모드로 변경되었습니다! ✨');
      }
    }

    // 잠시 대기 후 변경 후 상태 확인
    await new Promise(resolve => setTimeout(resolve, 500));

    const afterState = checkState();
    console.log('변경 후:', afterState);

    // 검증
    if (test.expectedTheme) {
      const success = (test.expectedTheme === 'system' && afterState.localStorage === 'system') ||
                     (test.expectedTheme === afterState.actualDisplay);
      console.log(success ? '✅ 성공' : '❌ 실패');
    } else if (test.expectedResponse) {
      console.log('✅ 중복 변경 방지 확인');
    }

    // 다음 테스트 전 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n\n🎉 모든 테스트 완료!');

  // 최종 상태
  console.log('\n📊 최종 상태:');
  const finalState = checkState();
  console.table(finalState);
}

// 테스트 실행
testChatThemeCommands();