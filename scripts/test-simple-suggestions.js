/**
 * Test Script for Simple Suggestion System
 *
 * Tests the stability and performance of the simplified suggestion service
 */

const fetch = require('node-fetch');

// Test configuration
const API_URL = 'http://localhost:3000/api/ai/suggestions';
const TEST_SCENARIOS = [
  {
    name: 'Basic Korean suggestions',
    payload: {
      locale: 'ko',
      sessionId: 'test-session-1'
    }
  },
  {
    name: 'Basic English suggestions',
    payload: {
      locale: 'en',
      sessionId: 'test-session-2'
    }
  },
  {
    name: 'Follow-up suggestions',
    payload: {
      locale: 'ko',
      sessionId: 'test-session-3',
      lastAIResponse: {
        message: '오늘 일정을 확인했습니다. 오후 3시에 회의가 있습니다.'
      }
    }
  },
  {
    name: 'With selected date',
    payload: {
      locale: 'ko',
      sessionId: 'test-session-4',
      selectedDate: new Date().toISOString()
    }
  },
  {
    name: 'With recent messages',
    payload: {
      locale: 'ko',
      sessionId: 'test-session-5',
      recentMessages: [
        { role: 'user', content: '내일 회의 일정 추가해줘' },
        { role: 'assistant', content: '내일 회의 일정을 추가했습니다.' }
      ]
    }
  }
];

// Performance metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  responseTimes: [],
  cacheHits: 0
};

async function testScenario(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log('Request payload:', JSON.stringify(scenario.payload, null, 2));

  const startTime = Date.now();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(scenario.payload)
    });

    const responseTime = Date.now() - startTime;
    metrics.responseTimes.push(responseTime);
    metrics.totalRequests++;

    if (response.ok) {
      const data = await response.json();
      metrics.successfulRequests++;

      // Check if cache was used
      if (data.data?.context?.isSimplified) {
        console.log('✅ Using simplified service');
      }

      console.log(`📊 Response time: ${responseTime}ms`);
      console.log(`📝 Suggestions count: ${data.data?.suggestions?.length || 0}`);
      console.log('Suggestions:', data.data?.suggestions || []);

      // Validate response structure
      if (!data.data?.suggestions || !Array.isArray(data.data.suggestions)) {
        console.warn('⚠️  Invalid response structure');
      }

      if (data.data?.suggestions?.length === 0) {
        console.warn('⚠️  No suggestions returned');
      }

      return { success: true, responseTime, data };
    } else {
      metrics.failedRequests++;
      console.error(`❌ Request failed with status: ${response.status}`);
      return { success: false, responseTime };
    }
  } catch (error) {
    metrics.failedRequests++;
    metrics.totalRequests++;
    console.error('❌ Request error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testCachePerformance() {
  console.log('\n📦 Testing cache performance...');

  const testPayload = {
    locale: 'ko',
    sessionId: 'cache-test'
  };

  // First request (should miss cache)
  console.log('First request (cache miss expected)...');
  const result1 = await testScenario({ name: 'Cache test 1', payload: testPayload });

  // Second request (should hit cache)
  console.log('\nSecond request (cache hit expected)...');
  const result2 = await testScenario({ name: 'Cache test 2', payload: testPayload });

  if (result2.responseTime < result1.responseTime * 0.5) {
    console.log('✅ Cache appears to be working (second request was much faster)');
    metrics.cacheHits++;
  } else {
    console.log('⚠️  Cache may not be working effectively');
  }
}

async function testRateLimiting() {
  console.log('\n🚦 Testing rate limiting...');

  const requests = [];
  for (let i = 0; i < 10; i++) {
    requests.push(testScenario({
      name: `Rate limit test ${i}`,
      payload: {
        locale: 'ko',
        sessionId: `rate-limit-test-${i}`
      }
    }));
  }

  const results = await Promise.all(requests);
  const rateLimited = results.filter(r => !r.success).length;

  if (rateLimited > 0) {
    console.log(`⚠️  ${rateLimited} requests were rate limited`);
  } else {
    console.log('✅ No rate limiting detected for 10 concurrent requests');
  }
}

async function runAllTests() {
  console.log('🚀 Starting Simple Suggestion Service Tests');
  console.log('============================================\n');

  // Test each scenario
  for (const scenario of TEST_SCENARIOS) {
    await testScenario(scenario);
    // Add small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test cache performance
  await testCachePerformance();

  // Test rate limiting
  await testRateLimiting();

  // Calculate metrics
  const avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
  const minResponseTime = Math.min(...metrics.responseTimes);
  const maxResponseTime = Math.max(...metrics.responseTimes);

  console.log('\n============================================');
  console.log('📊 PERFORMANCE SUMMARY');
  console.log('============================================');
  console.log(`Total requests: ${metrics.totalRequests}`);
  console.log(`Successful: ${metrics.successfulRequests}`);
  console.log(`Failed: ${metrics.failedRequests}`);
  console.log(`Success rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`);
  console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`Min response time: ${minResponseTime}ms`);
  console.log(`Max response time: ${maxResponseTime}ms`);
  console.log(`Cache hits: ${metrics.cacheHits}`);

  // Performance assessment
  console.log('\n🎯 PERFORMANCE ASSESSMENT:');
  if (avgResponseTime < 100) {
    console.log('✅ Excellent: Average response time under 100ms');
  } else if (avgResponseTime < 500) {
    console.log('✅ Good: Average response time under 500ms');
  } else if (avgResponseTime < 1000) {
    console.log('⚠️  Acceptable: Average response time under 1s');
  } else {
    console.log('❌ Poor: Average response time over 1s');
  }

  if (metrics.successfulRequests === metrics.totalRequests) {
    console.log('✅ Perfect reliability: 100% success rate');
  } else if ((metrics.successfulRequests / metrics.totalRequests) > 0.95) {
    console.log('✅ High reliability: >95% success rate');
  } else {
    console.log('❌ Low reliability: <95% success rate');
  }
}

// Check if server is running
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.error('❌ Server is not running. Please start the development server first.');
    console.log('Run: npm run dev');
    return false;
  }
}

// Main execution
(async () => {
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    process.exit(1);
  }

  await runAllTests();

  console.log('\n✨ Tests completed!');
})().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});