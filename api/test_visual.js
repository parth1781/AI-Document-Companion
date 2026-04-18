import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai-companion');
        console.log('Connected to DB');
        const db = mongoose.connection.db;
        const col = db.collection('documents');
        const doc = await col.findOne();
        if (!doc) {
            console.log("No document found");
            process.exit(1);
        }
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            systemInstruction: 'You are a visual document summarizer.',
        });
        
        const prompt = `Based on the following document text, create a highly visual summary in strictly formatted Markdown. Include 3-5 distinct sections. Each section must have:
1. A descriptive heading (e.g. ### 1. Core Concept)
2. A short, engaging summary paragraph explaining the concept.
3. An image embedded using exactly this markdown syntax: ![Image](https://image.pollinations.ai/prompt/{URL_ENCODED_PROMPT}?width=800&height=400&nologo=true)
Replace {URL_ENCODED_PROMPT} with a safe, detailed, descriptive, comma-separated image generation prompt related to the section (e.g., "beautiful_abstract_digital_art_representing_concept"). Ensure the prompt is URL encoded.
Do not output anything other than the Markdown.
Text context: ${doc.extractedText.substring(0, 10000)}`;

        console.log("Generating...");
        const result = await model.generateContent(prompt);
        console.log("Success:\n", result.response.text());
    } catch (e) {
        console.error("Error generating content:", e);
    }
    process.exit(0);
}

test();
