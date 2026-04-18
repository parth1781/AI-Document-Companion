import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

async function testGemini() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Using key:", key ? key.substring(0, 5) + "..." : "MISSING");
    
    if (!key) {
        console.error("ERROR: GEMINI_API_KEY is missing in server/.env");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello, are you working?");
        console.log("Response:", result.response.text());
        console.log("SUCCESS: Gemini API is working!");
    } catch (error) {
        console.error("API ERROR:", error.message);
        if (error.message.includes("API_KEY_INVALID")) {
            console.error("REASON: The API key provided is invalid.");
        } else if (error.message.includes("location is not supported")) {
            console.error("REASON: Gemini is not available in your region, or you need a VPN.");
        }
    }
}

testGemini();
