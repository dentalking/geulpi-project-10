// Test date filtering for AI chat queries
const fetch = require('node-fetch');

async function testDateFiltering() {
  const baseUrl = 'http://localhost:3000/api/ai/chat';

  // Test queries
  const testCases = [
    { message: "오늘 일정 보여줘", expectedDateRange: "today" },
    { message: "내일 일정 확인", expectedDateRange: "tomorrow" },
    { message: "이번 주 일정", expectedDateRange: "this_week" },
    { message: "회의 일정 검색", expectedDateRange: "text_search" }
  ];

  console.log('🧪 Testing date filtering for AI chat queries...\n');

  for (const test of testCases) {
    console.log(`\n📋 Testing: "${test.message}"`);
    console.log(`Expected: ${test.expectedDateRange}`);

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=test' // You may need actual auth token
        },
        body: JSON.stringify({
          message: test.message,
          locale: 'ko',
          sessionId: 'test-session'
        })
      });

      const data = await response.json();

      if (data.action?.type === 'search') {
        const searchData = data.action.data;
        console.log('✅ Search action detected:');
        console.log(`   - Query: ${searchData.query || 'none'}`);
        console.log(`   - StartDate: ${searchData.startDate || 'none'}`);
        console.log(`   - EndDate: ${searchData.endDate || 'none'}`);

        // Check if date keywords are NOT in query field
        const dateKeywords = ['오늘', '내일', '어제', '이번주', '다음주'];
        const hasDateKeywordInQuery = dateKeywords.some(keyword =>
          searchData.query && searchData.query.includes(keyword)
        );

        if (hasDateKeywordInQuery) {
          console.log('⚠️ WARNING: Date keyword found in query field!');
          console.log('   This may cause incorrect filtering.');
        } else {
          console.log('✅ Date keywords correctly excluded from query field');
        }
      } else {
        console.log('❌ No search action returned');
        console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
      }

      if (data.events && Array.isArray(data.events)) {
        console.log(`📅 Events returned: ${data.events.length}`);

        // Check date range of events
        if (data.events.length > 0) {
          const dates = data.events.map(e =>
            new Date(e.start?.dateTime || e.start?.date).toLocaleDateString('ko-KR')
          );
          const uniqueDates = [...new Set(dates)];
          console.log(`   Unique dates: ${uniqueDates.join(', ')}`);
        }
      }

    } catch (error) {
      console.error(`❌ Error testing "${test.message}":`, error.message);
    }
  }

  console.log('\n✅ Date filtering test complete!\n');
}

// Helper to check date ranges
function checkDateRange(events, expectedRange) {
  if (!events || events.length === 0) return true;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (expectedRange) {
    case 'today':
      return events.every(e => {
        const eventDate = new Date(e.start?.dateTime || e.start?.date);
        return eventDate >= today && eventDate < tomorrow;
      });

    case 'tomorrow':
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
      return events.every(e => {
        const eventDate = new Date(e.start?.dateTime || e.start?.date);
        return eventDate >= tomorrow && eventDate < dayAfterTomorrow;
      });

    default:
      return true;
  }
}

testDateFiltering().catch(console.error);