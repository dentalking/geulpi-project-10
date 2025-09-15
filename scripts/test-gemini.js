require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  console.log('Testing Gemini API...');
  console.log('API Key exists:', !!process.env.GEMINI_API_KEY);
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = "Say 'Hello, Gemini is working!' in Korean.";
    
    console.log('Sending test prompt to Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API Response:', text);
    console.log('✅ Gemini API is working properly!');
  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
    if (error.message.includes('API_KEY_INVALID')) {
      console.error('The API key is invalid. Please check your GEMINI_API_KEY in .env.local');
    }
  }
}

testGeminiAPI();