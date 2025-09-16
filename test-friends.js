const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const userId = '2ced695b-b2f6-40ea-802f-a181303e8ab4';
const email = 'test@example.com';

// Generate test token
const token = jwt.sign(
  { userId, email },
  JWT_SECRET,
  { expiresIn: '7d' }
);

console.log('Testing Friends Feature End-to-End');
console.log('=====================================');

// Test 1: Send friend request
const testFriendRequest = async () => {
  try {
    console.log('\n1. Testing Friend Request...');
    const response = await fetch('http://localhost:3000/api/friends/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${token}`
      },
      body: JSON.stringify({
        friendEmail: "friend@example.com",
        message: "친구 신청입니다!"
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Friend Request Error:', error);
    return null;
  }
};

// Test 2: List friends
const testListFriends = async () => {
  try {
    console.log('\n2. Testing List Friends...');
    const response = await fetch('http://localhost:3000/api/friends', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${token}`
      }
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('List Friends Error:', error);
    return null;
  }
};

// Test 3: Respond to friend request (if any exist)
const testRespondToRequest = async () => {
  try {
    console.log('\n3. Testing Respond to Friend Request...');
    const response = await fetch('http://localhost:3000/api/friends/respond', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${token}`
      },
      body: JSON.stringify({
        requestId: "test-request-id",
        action: "accept"
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Respond to Request Error:', error);
    return null;
  }
};

// Run all tests
const runFriendsTests = async () => {
  await testFriendRequest();
  await testListFriends();
  await testRespondToRequest();
  console.log('\n=== Friends Feature Testing Complete ===');
};

runFriendsTests();