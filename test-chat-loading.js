// 과거 채팅 로드 테스트
async function testChatLoading() {
  const baseUrl = 'http://localhost:3000';
  
  // 1. 특정 세션 직접 조회 (새로운 방식)
  console.log('\n=== Testing specific session fetch ===');
  const specificResponse = await fetch(`${baseUrl}/api/chat/sessions?sessionId=chat_1757311656183_v138xn1aq`);
  const specificResult = await specificResponse.json();
  
  if (specificResult.success) {
    console.log('Session found:', {
      id: specificResult.data.id,
      title: specificResult.data.title,
      messageCount: specificResult.data.messages?.length || 0,
      messages: specificResult.data.messages?.map(m => ({
        role: m.role,
        content: m.content.substring(0, 50) + '...'
      }))
    });
  } else {
    console.log('Session not found:', specificResult.error);
  }
  
  // 2. 모든 세션 조회해서 확인
  console.log('\n=== Testing all sessions fetch ===');
  const allResponse = await fetch(`${baseUrl}/api/chat/sessions?limit=10`);
  const allResult = await allResponse.json();
  
  if (allResult.success) {
    console.log('Total sessions:', allResult.data.length);
    allResult.data.forEach(session => {
      console.log(`- ${session.id}: ${session.title} (${session.messages?.length || 0} messages)`);
    });
  }
}

testChatLoading().catch(console.error);