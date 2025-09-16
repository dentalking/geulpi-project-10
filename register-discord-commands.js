/**
 * Discord Slash Commands 등록 스크립트
 */

const { REST, Routes } = require('discord.js');
require('dotenv').config({ path: '.env.local' });

const commands = [
  {
    name: 'schedule',
    description: '새로운 일정을 추가합니다',
    options: [
      {
        name: 'title',
        description: '일정 제목',
        type: 3, // STRING
        required: true
      },
      {
        name: 'datetime',
        description: '날짜 및 시간 (예: 내일 오후 3시, 2024-01-15 14:00)',
        type: 3, // STRING
        required: true
      },
      {
        name: 'location',
        description: '장소 (선택사항)',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'today',
    description: '오늘의 일정을 확인합니다'
  },
  {
    name: 'meet',
    description: '친구와 만날 시간을 찾아줍니다',
    options: [
      {
        name: 'friend',
        description: '만날 친구를 멘션하세요',
        type: 6, // USER
        required: true
      },
      {
        name: 'date',
        description: '원하는 날짜 (예: 내일, 이번 주말)',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'friends',
    description: '친구 목록을 관리합니다'
  },
  {
    name: 'help',
    description: '봇 사용법을 확인합니다'
  }
];

async function registerCommands() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const applicationId = process.env.DISCORD_APPLICATION_ID;

  if (!token || !applicationId) {
    console.error('❌ Discord 환경변수가 설정되지 않았습니다!');
    console.error('DISCORD_BOT_TOKEN:', !!token);
    console.error('DISCORD_APPLICATION_ID:', !!applicationId);
    return;
  }

  const rest = new REST().setToken(token);

  try {
    console.log('🚀 Discord Slash Commands 등록 중...');

    // Global commands 등록 (모든 서버에서 사용 가능, 최대 1시간 소요)
    const data = await rest.put(
      Routes.applicationCommands(applicationId),
      { body: commands }
    );

    console.log(`✅ ${data.length}개의 Slash Commands가 등록되었습니다!`);
    console.log('등록된 명령어들:');
    data.forEach(cmd => {
      console.log(`  /${cmd.name} - ${cmd.description}`);
    });

    console.log('\n📝 참고사항:');
    console.log('- Global Commands는 최대 1시간 후에 모든 서버에서 사용 가능합니다');
    console.log('- 즉시 테스트하려면 특정 서버(길드)에만 등록하는 방법도 있습니다');

  } catch (error) {
    console.error('❌ Slash Commands 등록 실패:', error);

    if (error.code === 50001) {
      console.error('🔒 봇에게 applications.commands 권한이 없습니다');
      console.error('해결방법: OAuth2 URL에 applications.commands 스코프가 포함되어 있는지 확인하세요');
    } else if (error.code === 401) {
      console.error('🔑 봇 토큰이 유효하지 않습니다');
      console.error('해결방법: .env.local의 DISCORD_BOT_TOKEN을 확인하세요');
    }
  }
}

// 실행
registerCommands();