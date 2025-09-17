// Test email sending via API
const fetch = require('node-fetch');

async function testEmailSending() {
  try {
    const response = await fetch('http://localhost:3000/api/test/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'optiroomhr@gmail.com',
        subject: 'Test from Geulpi',
      })
    });

    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testEmailSending();
