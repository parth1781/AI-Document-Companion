import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractTextFromFile } from './utils/parser.js';
import Document from './models/Document.js';
import Chat from './models/Chat.js';
import Note from './models/Note.js';
import User from './models/User.js';
import ForumSession from './models/ForumSession.js';
import BuilderSession from './models/BuilderSession.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

dotenv.config();

// Create SMTP transporter (falls back to Ethereal test account if no SMTP_USER set)
let transporter;
const createTransporter = async () => {
  if (process.env.SMTP_USER && process.env.SMTP_USER !== 'your_email@gmail.com') {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false }
    });
    // Verify SMTP connection immediately and log result
    transporter.verify((err, ok) => {
      if (err) {
        console.error('SMTP ERROR: Could not authenticate:', err.message);
        console.error('  → Check SMTP_USER and SMTP_PASS in .env');
        console.error('  → For Gmail: make sure you are using an App Password, not your normal password.');
        console.error('  → Generate one at: myaccount.google.com/apppasswords');
      } else {
        console.log('SMTP: ✅ Gmail connected successfully as:', process.env.SMTP_USER);
      }
    });
  } else {
    // Auto-create a free Ethereal test account for development
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    console.log('SMTP: Using Ethereal test account:', testAccount.user);
    console.log('SMTP: To get the OTP, open the preview URL logged when you request a reset.');
  }
};
createTransporter();
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Google Gen AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Kill Switch Middleware
const killSwitch = (req, res, next) => {
  if (process.env.KILL_SWITCH_ACTIVE === 'true') {
    return res.status(503).json({ error: 'Service temporarily disabled by administrator.' });
  }
  next();
};
app.use(killSwitch);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', limiter);

// Multer setup for file uploads (Memory Storage, 10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai-companion')
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- ROUTES ---

// Auth Middleware
const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// AUTH ROUTES

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'An account with this email already exists.' });
    const user = await User.create({ name, email, password });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// Step 1: Request OTP for password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'No account found with this email.' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = expires;
    await user.save();

    // Always log OTP to console for easy dev/debug access
    console.log(`\n🔑 OTP for ${email}: ${otp}  (expires in 10 min)\n`);

    // Send email with OTP
    const mailOptions = {
      from: process.env.SMTP_FROM || 'Learning Hub <noreply@learninghub.app>',
      to: email,
      subject: 'Learning Hub — Password Reset OTP',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;">
          <h2 style="color:#4f46e5;margin-bottom:8px;">Password Reset</h2>
          <p style="color:#475569;">Use the one-time code below to reset your Learning Hub password. It expires in <strong>10 minutes</strong>.</p>
          <div style="font-size:2.5rem;font-weight:700;letter-spacing:12px;text-align:center;padding:24px;background:#f1f5f9;border-radius:8px;color:#1e293b;margin:24px 0;">${otp}</div>
          <p style="color:#94a3b8;font-size:0.875rem;">If you did not request a password reset, please ignore this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    // Log preview URL for Ethereal (dev) accounts
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log('OTP Email Preview URL:', preview);

    res.json({ message: 'OTP sent to your email address.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send OTP email.' });
  }
});

// Step 2: Verify OTP and reset password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'No account found with this email.' });

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please request a new one.' });
    }
    if (user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Valid OTP — reset password and clear OTP fields
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// Get current user (verify token)
app.get('/api/auth/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// 1. Upload Document
app.post('/api/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    
    const extractedText = await extractTextFromFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    
    const doc = new Document({
      originalName: req.file.originalname,
      extractedText,
      userId: req.userId
    });
    
    await doc.save();
    res.json({ message: 'File uploaded successfully', documentId: doc._id, text: extractedText });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1b. Get User's Documents
app.get('/api/documents', protect, async (req, res) => {
  try {
    const docs = await Document.find({ userId: req.userId }).sort({ uploadedAt: -1 }).select('-extractedText');
    res.json({ documents: docs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Helper for Gemini Prompting
const generateGeminiResponse = async (systemInstruction, userMessage) => {
  try {
    console.log(`[AI Request] Model: gemini-flash-latest, SystemLength: ${systemInstruction?.length}`);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction,
    });
    const result = await model.generateContent(userMessage);
    const text = result.response.text();
    console.log(`[AI Response] Success, Length: ${text.length}`);
    return text;
  } catch (error) {
    console.error('[AI Error]', error.message);
    throw error;
  }
};

const baseSystemInstruction = `You are a friendly, encouraging computer science tutor. 
When answering, you must provide your response in two parts using specific delimiters:
1. [SPOKEN]: A very brief, highly conversational, natural-sounding summary of your answer (no code, no markdown, no bullet points).
2. [DETAILED]: The full markdown response with code, formulas, and deep explanations. Keep your tone supportive and use analogies.`;

// 2. Chat with AI Document Context
app.post('/api/chat', async (req, res) => {
  try {
    const { documentId, message } = req.body;
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Save user message
    const userChat = new Chat({ documentId, role: 'user', content: message });
    await userChat.save();

    // Context aware prompt
    const instruction = `${baseSystemInstruction}
The user's document '${doc.originalName}' context: ${doc.extractedText.substring(0, 30000)}...`;

    // Fetch previous chats for history
    const history = await Chat.find({ documentId }).sort({ timestamp: 1 }).limit(10);
    let conversation = history.map(c => `${c.role === 'user' ? 'User' : 'AI'}: ${c.content}`).join('\n');
    conversation += `\nUser: ${message}\nAI:`;

    const rawResponse = await generateGeminiResponse(instruction, conversation);

    // Parse Response (Expects [SPOKEN] and [DETAILED] markers)
    let spokenSummary = '';
    let detailedContent = rawResponse;

    if (rawResponse.includes('[SPOKEN]') && rawResponse.includes('[DETAILED]')) {
      const parts = rawResponse.split('[DETAILED]');
      spokenSummary = parts[0].replace('[SPOKEN]', '').trim();
      detailedContent = parts[1].trim();
    }

    // Save AI response
    const aiChat = new Chat({ 
      documentId, 
      role: 'model', 
      content: detailedContent,
      spokenSummary 
    });
    await aiChat.save();

    res.json(aiChat);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// 3. Add Note
app.post('/api/notes', async (req, res) => {
  try {
    const { documentId, highlightedText, noteText } = req.body;
    const note = new Note({ documentId, highlightedText, noteText });
    await note.save();
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// 4. Summarize Session
app.post('/api/summarize/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const chats = await Chat.find({ documentId }).sort({ timestamp: 1 });
    const conversation = chats.map(c => `${c.role}: ${c.content}`).join('\n');
    
    const prompt = `Review the following chat log between a user and an AI tutor. Provide a condensed Markdown summary of what the user learned. Chat log:\n${conversation}`;
    
    const summary = await generateGeminiResponse('You are a helpful summarizer tutor.', prompt);
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate session summary' });
  }
});

// 4b. Fetch Shared Session
app.get('/api/session/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const chats = await Chat.find({ documentId }).sort({ timestamp: 1 });
    res.json({ document: doc.extractedText, chats });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching session' });
  }
});

const extractJSON = (text) => {
  const match = text.match(/\[[\s\S]*\]/);
  if (match) return match[0];
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

app.post('/api/study/visual-summary/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const prompt = `Based on the following document text, create a highly visual summary in strictly formatted Markdown. Include 3-5 distinct sections. Each section must have:
1. A descriptive heading (e.g. ### 1. Core Concept)
2. A short, engaging summary paragraph explaining the concept.
3. An image placeholder using exactly this syntax: [IMAGE: a descriptive prompt for the image]
Do not output anything other than the Markdown and the [IMAGE: ...] placeholders.
Text context: ${doc.extractedText.substring(0, 3000)}`;
        
    let summaryMarkdown = await generateGeminiResponse('You are a visual document summarizer.', prompt);
    
    // Parse placeholders and inject properly encoded images
    summaryMarkdown = summaryMarkdown.replace(/\[IMAGE:(.+?)\]/gi, (match, imagePrompt) => {
      const encoded = encodeURIComponent(imagePrompt.trim());
      return `![Image](https://pollinations.ai/p/${encoded}?width=800&height=400&nologo=true)`;
    });

    res.json({ summary: summaryMarkdown });
  } catch (error) {
    console.error('Visual summary error:', error);
    res.status(500).json({ error: 'Failed to generate visual summary: ' + error.message });
  }
});

app.post('/api/flashcards/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const prompt = `Based on the following document text, generate 5 flashcards to test the user's knowledge. 
Return ONLY a valid JSON array of objects without Markdown formatting. 
Each object must strictly have these fields:
- "question": The question text
- "answer": The answer text
- "themeColor": A hex color code (e.g. "#4f46e5") suitable for the theme of the question
Text context: ${doc.extractedText.substring(0, 10000)}`;
    
    const rawOutput = await generateGeminiResponse('You are a structured data generator.', prompt);
    let flashcardsData = [];
    try {
      flashcardsData = JSON.parse(extractJSON(rawOutput));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to parse JSON' });
    }
    res.json({ flashcards: flashcardsData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate flashcards' });
  }
});

// 5. Generate Digital Summaries
app.post('/api/study/summary-cards/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const prompt = `Based on the following document text, generate 5 digital summary infographic blocks for quick revision. 
Return ONLY a valid JSON array of objects without Markdown formatting. 
Each object must strictly have these fields:
- "topic": The core concept name
- "keyPoints": An array of 3 concise strings summarizing the concept
- "themeColor": A hex color code suitable for the theme
Text context: ${doc.extractedText.substring(0, 10000)}`;
    
    const rawOutput = await generateGeminiResponse('You are a structured data generator.', prompt);
    let summaryData = [];
    try {
      summaryData = JSON.parse(extractJSON(rawOutput));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to parse JSON' });
    }
    res.json({ summaries: summaryData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate digital summaries' });
  }
});

// 5b. Generate MCQ Quiz
app.post('/api/study/quiz/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const prompt = `Based on the following document text, generate 5 multiple-choice questions (MCQ) to test the user's knowledge. 
CRITICAL RULE: All 5 questions MUST BE COMPLETELY UNIQUE AND DISTINCT. Do not ask about the same concept twice. Ensure a wide coverage of the document.
Return ONLY a valid JSON array of objects without Markdown formatting. 
Each object must strictly have these fields:
- "question": The question text
- "options": An array of 4 distinct string options
- "correctAnswer": The exact string from the options array that is correct
Text context: ${doc.extractedText.substring(0, 10000)}`;
    
    const rawOutput = await generateGeminiResponse('You are a structured data generator.', prompt);
    let quizData = [];
    try {
      quizData = JSON.parse(extractJSON(rawOutput));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to parse JSON' });
    }
    res.json({ quizzes: quizData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// 6. Forum Multi-Agent Chat
const forumPersonas = {
  default: "You are an intellectual participant in a group discussion. Provide thoughtful insights.",
  devil: "You are the Devil's Advocate. Actively challenge the user's assumptions. Find flaws in their logic and provide counter-examples. Be respectful but highly critical.",
  socratic: "You are the Socratic Tutor. Never give the direct answer. Only ask probing questions to lead the user to the answer.",
  lateral: "You are the Lateral Thinker. Connect the current topic to completely unrelated fields, domains, or disciplines to spark creativity and out-of-the-box thinking.",
  synthesizer: "You are the Synthesizer. Act as the mediator. Summarize the different viewpoints discussed so far and outline the key takeaways in a concise format.",
  pragmatist: "You are the Pragmatist. Focus purely on real-world application. Ask about exact constraints, edge cases, cost, performance bottlenecks, and practical implementation details."
};

app.get('/api/forum/sessions', protect, async (req, res) => {
  try {
    const sessions = await ForumSession.find({ userId: req.userId }).sort({ lastUpdated: -1 }).select('-history');
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch forum sessions' });
  }
});

app.get('/api/forum/session/:id', protect, async (req, res) => {
  try {
    const session = await ForumSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/forum/chat', protect, async (req, res) => {
  try {
    const { sessionId, topic, message, persona, history } = req.body;
    
    let sysInstruction = forumPersonas[persona] || forumPersonas.default;
    sysInstruction += "\n\nYou are participating in 'The Forum', a multi-agent tech discussion space. Stay fully in character for this persona. Format your output in clean Markdown.\nCRITICAL RULE: Always try to provide at least one relevant real-world URL or reference link in your text for contextual explanation.";
    
    let conversation = (history || []).map(c => `${c.role === 'user' ? 'User' : 'Agent'}: ${c.content}`).join('\n');
    conversation += `\nUser: ${message}\nAgent:`;

    const responseText = await generateGeminiResponse(sysInstruction, conversation);
    
    let session;
    if (sessionId) {
      session = await ForumSession.findOne({ _id: sessionId, userId: req.userId });
    }
    if (!session) {
      session = new ForumSession({ userId: req.userId, topic: topic || 'New Discussion', history: [] });
    }
    
    const isHiddenMsg = message.includes('(System Topic context:');
    session.history.push({ role: 'user', content: message, isHidden: isHiddenMsg });
    session.history.push({ role: 'model', content: responseText });
    session.lastUpdated = Date.now();
    await session.save();

    res.json({ content: responseText, sessionId: session._id });
  } catch (error) {
    console.error('Forum chat error:', error);
    res.status(500).json({ error: 'Failed to generate forum response: ' + error.message });
  }
});

// 7. Builder Workflows
app.get('/api/builder/sessions', protect, async (req, res) => {
  try {
    const sessions = await BuilderSession.find({ userId: req.userId }).sort({ lastUpdated: -1 });
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch builder sessions' });
  }
});

app.get('/api/builder/session/:id', protect, async (req, res) => {
  try {
    const session = await BuilderSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/builder/generate', protect, async (req, res) => {
  try {
    const { sessionId, idea, workflowType } = req.body;
    let prompt = '';
    
    switch (workflowType) {
      case 'prd':
        prompt = `Generate a highly professional Product Requirements Document (PRD) for the following project idea: "${idea}". Include Executive Summary, Target Audience, Core Features, User Flows, and Non-functional Requirements. Format clearly in standard Markdown.`;
        break;
      case 'scrum':
        prompt = `Based on the following project idea: "${idea}", break down the core features into Epics and User Stories. Estimate Scrum Fibonacci points (1, 2, 3, 5, 8, 13) for each story. Format strictly as a professional Markdown table.`;
        break;
      case 'architecture':
        prompt = `Propose an optimal, scalable tech stack architecture for the following project: "${idea}". Suggest the frontend framework, backend engine, database, and cloud infrastructure. Detail the rationale, trade-offs, and scalability. CRITICAL: You must include a beautifully formatted ASCII flowchart block that visually maps the architecture components and their data flows. Format everything in Markdown.`;
        break;
      case 'risk':
        prompt = `Perform a comprehensive Risk & Security Analysis for the project: "${idea}". Identify potential security vulnerabilities (e.g., OWASP), data privacy compliance issues (GDPR/SOC2), bottlenecks, and mitigation strategies. Make sure to use standard Markdown headers (##) and bullet points (-) so that the formatting renders flawlessly.`;
        break;
      case 'timeline':
        prompt = `Create a realistic Go-to-Market (GTM) timeline roadmap for building: "${idea}". Include Phase 1 (MVP Architecture), Phase 2 (Core Logic), and Phase 3 (Launch & Scale). List critical dependencies and estimated duration in weeks. Format in Markdown.`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid workflow type' });
    }

    const sysInstruction = 'You are a Principal Software Architect and VP of Engineering. Provide structured, highly professional, realistic, and insightful technical documents.';
    const responseText = await generateGeminiResponse(sysInstruction, prompt);
    console.log('[Builder] Document generated successfully');
    
    let session;
    if (sessionId) {
      session = await BuilderSession.findOne({ _id: sessionId, userId: req.userId });
    }
    if (!session) {
      session = new BuilderSession({ userId: req.userId, idea: idea || 'New Project' });
    }
    
    session.workflows[workflowType] = responseText;
    session.lastUpdated = Date.now();
    await session.save();

    res.json({ content: responseText, sessionId: session._id });
  } catch (error) {
    console.error('Builder error:', error);
    res.status(500).json({ error: 'Failed to generate builder document: ' + error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
