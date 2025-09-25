#!/usr/bin/env node

/**
 * Test script for follow-up suggestions
 * Tests the suggestion API with a simulated AI response
 */

const fetch = require('node-fetch');

async function testFollowUpSuggestions() {
  const API_URL = 'http://localhost:3000/api/ai/suggestions';

  console.log('🧪 Testing follow-up suggestions...\n');

  // Test 1: Initial suggestions (no AI response)
  console.log('1️⃣ Testing initial suggestions (no AI response)');
  try {
    const response1 = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locale: 'ko',
        sessionId: 'test-session-001',
        recentMessages: []
      })
    });

    const data1 = await response1.json();
    console.log('Initial suggestions received:', data1.data?.suggestions?.length || 0, 'suggestions');
    if (data1.data?.suggestions) {
      console.log('Sample suggestions:', data1.data.suggestions.slice(0, 2));
    }
  } catch (error) {
    console.error('Error fetching initial suggestions:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Follow-up suggestions (with AI response)
  console.log('2️⃣ Testing follow-up suggestions (with AI response)');
  try {
    const mockAIResponse = {
      message: "오늘 하루를 정리해드릴게요. 아침 9시에 팀 회의가 있고, 오후 2시에 프로젝트 리뷰가 예정되어 있습니다. 저녁 6시에는 개인 시간으로 운동이 계획되어 있네요.",
      action: {
        type: 'summary',
        data: {
          eventsToday: 3
        }
      }
    };

    const response2 = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locale: 'ko',
        sessionId: 'test-session-002',
        recentMessages: [
          { role: 'user', content: 'Wrap up today' },
          { role: 'assistant', content: mockAIResponse.message }
        ],
        lastAIResponse: mockAIResponse
      })
    });

    const data2 = await response2.json();
    console.log('Follow-up suggestions received:', data2.data?.suggestions?.length || 0, 'suggestions');
    if (data2.data?.suggestions) {
      console.log('\nAll follow-up suggestions:');
      data2.data.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }

    // Check if suggestions are contextually relevant
    console.log('\n📊 Context analysis:');
    console.log('- isFollowUp:', data2.data?.context?.isFollowUp || false);
    console.log('- Has smart suggestions:', !!data2.data?.smartSuggestions);
  } catch (error) {
    console.error('Error fetching follow-up suggestions:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Follow-up suggestions with calendar context
  console.log('3️⃣ Testing follow-up suggestions with calendar event context');
  try {
    const mockAIResponse = {
      message: "내일 회의가 2개 충돌하고 있습니다. 오전 10시에 '기획 회의'와 '디자인 리뷰'가 같은 시간에 예정되어 있어요.",
      action: {
        type: 'conflict_detected',
        data: {
          conflictingEvents: ['기획 회의', '디자인 리뷰']
        }
      }
    };

    const response3 = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locale: 'ko',
        sessionId: 'test-session-003',
        recentMessages: [
          { role: 'user', content: '내일 일정 확인해줘' },
          { role: 'assistant', content: mockAIResponse.message }
        ],
        lastAIResponse: mockAIResponse,
        selectedDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    });

    const data3 = await response3.json();
    console.log('Conflict-aware suggestions received:', data3.data?.suggestions?.length || 0, 'suggestions');
    if (data3.data?.suggestions) {
      console.log('\nConflict resolution suggestions:');
      data3.data.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }
  } catch (error) {
    console.error('Error fetching conflict-aware suggestions:', error.message);
  }

  console.log('\n✅ Test complete!');
}

// Run tests
testFollowUpSuggestions().catch(console.error);