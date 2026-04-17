import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const speak = (text) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
  if (naturalVoice) utterance.voice = naturalVoice;
  window.speechSynthesis.speak(utterance);
};

export const useChatStore = create((set, get) => ({
  messages: [{
    id: 'welcome',
    role: 'model',
    detailedContent: 'Hello! I am your AI Companion. Upload a document and ask me anything. You can also highlight text to quickly interact with me.',
    spokenSummary: 'Welcome! I am ready to help you learn.'
  }],
  notes: [],
  quizMistakes: [],
  isLoading: false,

  setMessages: (updater) => set((state) => ({ 
    messages: typeof updater === 'function' ? updater(state.messages) : updater 
  })),

  loadSession: (chats) => {
    const initial = [{
      id: 'welcome',
      role: 'model',
      detailedContent: 'Hello! I am your AI Companion. Upload a document and ask me anything. You can also highlight text to quickly interact with me.',
      spokenSummary: 'Welcome! I am ready to help you learn.'
    }];
    const formatted = chats.map(c => ({ 
      id: c._id, 
      role: c.role, 
      detailedContent: c.content, 
      spokenSummary: c.spokenSummary 
    }));
    set({ messages: [...initial, ...formatted], isLoading: false });
  },

  sendQuery: async (queryText, documentId) => {
    if (!documentId) {
      alert("Please upload a document first.");
      return;
    }
    
    const newMsg = { id: Date.now(), role: 'user', content: queryText };
    set((state) => ({ messages: [...state.messages, newMsg], isLoading: true }));

    try {
      const res = await axios.post(`${API_URL}/api/chat`, {
        documentId,
        message: queryText
      });
      
      const aiResponse = res.data;
      const aiMsg = {
        id: aiResponse._id || Date.now(),
        role: 'model',
        detailedContent: aiResponse.content,
        spokenSummary: aiResponse.spokenSummary
      };
      
      set((state) => ({ messages: [...state.messages, aiMsg], isLoading: false }));
      
      if (aiMsg.spokenSummary) {
        speak(aiMsg.spokenSummary);
      } else {
        speak("Here is your detailed answer.");
      }
      
    } catch (error) {
      console.error(error);
      set((state) => ({ 
        messages: [...state.messages, { id: Date.now(), role: 'model', detailedContent: 'Sorry, I encountered an error processing your request.' }],
        isLoading: false
      }));
    }
  },

  pushLocalMessage: (text) => {
    set((state) => ({
      notes: [...state.notes, text],
      messages: [...state.messages, { id: Date.now(), role: 'model', detailedContent: `Saved to your notes!`, spokenSummary: 'Note saved successfully.' }]
    }));
    speak('Note saved successfully.');
  },

  addQuizMistake: (question, wrongAnswer, correctAnswer) => set(state => ({
    quizMistakes: [...state.quizMistakes, { question, wrongAnswer, correctAnswer }]
  }))
}));
