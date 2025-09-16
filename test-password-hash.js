const bcrypt = require('bcryptjs');

const storedHash = '$2b$10$p52VB2phHjGYXGkZW52k/OMCTPqkj6L.dYqnruEEKiI8zHTltJ7Fq';
const testPasswordValue = 'test123456';

async function testPassword() {
  console.log('Testing password verification...');
  console.log('Stored hash:', storedHash);
  console.log('Test password:', testPasswordValue);

  const isValid = await bcrypt.compare(testPasswordValue, storedHash);
  console.log('Password match:', isValid);

  if (!isValid) {
    // Generate correct hash for test123456
    const newHash = await bcrypt.hash(testPasswordValue, 10);
    console.log('\nCorrect hash for test123456:');
    console.log(newHash);
  }
}

testPassword();