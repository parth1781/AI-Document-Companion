import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    console.log('Testing Gemini API with key:', process.env.GEMINI_API_KEY ? 'FOUND' : 'MISSING');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Hello, are you working?');
    console.log('Response:', result.response.text());
    console.log('SUCCESS');
  } catch (error) {
    console.error('FAILURE:', error.message);
    if (error.stack) console.error(error.stack);
  }
}

test();
