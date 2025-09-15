require('dotenv').config({ path: '.env.local' });

async function testAIChat() {
  const API_URL = 'http://localhost:3000/api/ai/chat';
  
  console.log('Testing AI Chat API...\n');
  
  // Test cases
  const testCases = [
    {
      name: 'Simple greeting',
      message: '안녕하세요',
      type: 'text',
      locale: 'ko'
    },
    {
      name: 'Event creation request',
      message: '내일 오후 3시에 회의 일정 추가해줘',
      type: 'text',
      locale: 'ko'
    },
    {
      name: 'Event query',
      message: '오늘 일정 보여줘',
      type: 'text',
      locale: 'ko'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Message: "${testCase.message}"`);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Simulate auth cookie for testing
          'Cookie': 'auth-token=test-token'
        },
        body: JSON.stringify({
          message: testCase.message,
          type: testCase.type,
          locale: testCase.locale,
          sessionId: 'test-session-' + Date.now(),
          timezone: 'Asia/Seoul'
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Success!`);
        console.log(`   Response: ${result.message?.substring(0, 100)}...`);
        if (result.action) {
          console.log(`   Action: ${JSON.stringify(result.action).substring(0, 100)}...`);
        }
        if (result.suggestions) {
          console.log(`   Suggestions: ${result.suggestions.join(', ')}`);
        }
      } else {
        console.log(`   ❌ Error: ${JSON.stringify(result, null, 2)}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n✨ AI Chat API test completed!');
}

// Run the test
testAIChat().catch(console.error);