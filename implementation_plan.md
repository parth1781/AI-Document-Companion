# AI Document Companion - Implementation Plan

## Goal Description
Build an AI-powered conversational web app to help users understand technical documents using the MERN stack and Google Gemini API. The app acts as a friendly companion with features like text highlighting, adding notes, conversational voice replies (TTS), session summaries, ELI5 actions, and flashcard generation. The UI will prioritize a modern, premium aesthetic with a top navigation bar and no side sliders.

## Proposed Architecture
- **Tech Stack**: MERN (MongoDB Atlas, Express, React, Node.js)
- **Frontend**: Vite + React, Vanilla CSS
- **Backend**: Node.js + Express
- **AI Integration**: Google Gemini API (Free tier)
- **Storage**: MongoDB Atlas for chat history, text, notes, and metadata

## Proposed Changes

### Configuration
- Backend `.env`: `PORT=5000`, `MONGO_URI`, `GEMINI_API_KEY`, `MAX_FILE_SIZE=10485760`, `KILL_SWITCH_ACTIVE=false`
- Frontend `.env`: `VITE_API_URL=http://localhost:5000`

### Backend Component (`d:/TY/project/proj 103.3/server`)
- Initialize Node app with dependencies.
- **Middleware**: 
  - Multer for 10MB file limit.
  - Kill Switch checking `KILL_SWITCH_ACTIVE` and responding with 503 if true.
  - Express rate-limiting.
- **Controllers**:
  - File upload endpoint & Document parsing. Note: to parse PDF, doc, and ppt we will integrate standard parsing packages or standard text extraction tools.
  - Chat controller: Using Gemini API to process requests. Enforcing the System Prompt:
    `"You are a friendly, encouraging computer science tutor. The user's document '{doc_title}' context: {extracted_text}. When answering, you must provide your response in two parts using JSON-like structure or specific delimiters: 1. [SPOKEN]: A very brief, highly conversational, natural-sounding summary of your answer (no code, no markdown, no bullet points). 2. [DETAILED]: The full markdown response with code, formulas, and deep explanations. Keep your tone supportive and use analogies."`
- **Models**: `Document`, `Chat`, `Note` schemas.

### Frontend Component (`d:/TY/project/proj 103.3/client`)
- Initialize Vite React app.
- **UI Architecture**:
  - **Layout**: Top Navigation Bar. No Left/Right Sliders. The main view will likely be a split view (Document on left, Chat on right) or similar intuitive design.
  - **Styling**: Premium, light theme preferred, vanilla CSS.
  - **Document Viewer**: Component to render extracted text. Users can highlight text. Upon highlight, a small popup tooltip appears with options: "Ask AI", "Add Note", "Explain Like I'm 5 (ELI5)".
  - **Chat Area**: Displays chat history. When the backend returns `[SPOKEN]` and `[DETAILED]`, the UI will separate them.
    - Standard Web Speech API triggers and reads the `[SPOKEN]` text aloud.
    - Markdown rendering package used to display the `[DETAILED]` section.
  - **Other actions**: "Summarize Session" button to consolidate learning. "Generate Flashcards" button to test knowledge.

## User Review Required
> [!IMPORTANT]
> The implementation plan incorporates all requested features (Kill switch, specific prompt format, MERN stack, Web Speech API, layout instructions).
> Please review and approve this plan so we can proceed with execution.

## Verification Plan
### Manual Verification
1. Verify Kill switch works by toggling the variable in `.env`.
2. Upload a file, ensure it correctly parses and renders in the UI.
3. Highlight text and test "Ask AI" context menu.
4. Verify response includes both spoken and detailed sections, and TTS reads the spoken version.
5. Create notes, request ELI5, and generate a session summary.
