import { create } from 'zustand';
import axios from 'axios';

import { API_URL } from '../config';

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
  localSummaryInsights: [],
  isLoading: false,
  localDocText: '',   // Cached raw text for offline search

  setDocumentText: (text) => set({ localDocText: text }),

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
      
      set((state) => {
        const newInsights = queryText.toLowerCase().includes('eli5') || queryText.toLowerCase().includes('explain') 
          ? [...state.localSummaryInsights, { query: queryText, insight: aiResponse.content }]
          : state.localSummaryInsights;
          
        return { 
          messages: [...state.messages, aiMsg], 
          isLoading: false,
          localSummaryInsights: newInsights
        };
      });
      
      if (aiMsg.spokenSummary) {
        speak(aiMsg.spokenSummary);
      } else {
        speak("Here is your detailed answer.");
      }
      
    } catch (error) {
      console.error(error);

      // --- Offline / API-failure fallback: local keyword search ---
      const { localDocText } = get();
      if (localDocText && localDocText.length > 100) {
        const buildOfflineAnswer = (query, docText) => {
          // Split text into sentences
          const sentences = docText
            .replace(/\r\n/g, '\n')
            .split(/(?<=[.!?\n])\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 30);

          // Tokenise query: remove stop words, lower-case
          const stopWords = new Set(['is','are','was','the','a','an','of','in','to','for','with','on','and','or','what','how','why','when','where','can','does','do','i','my','me','it','its','this','that','these','those','could','would','should']);
          const queryTokens = query
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w));

          if (queryTokens.length === 0) return null;

          // Score each sentence by matching token count
          const scored = sentences.map(sent => {
            const lc = sent.toLowerCase();
            const score = queryTokens.reduce((acc, t) => acc + (lc.includes(t) ? 1 : 0), 0);
            return { sent, score };
          });

          const top = scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(s => s.sent);

          if (top.length === 0) return null;
          return `**(Offline Mode)** Here are the most relevant passages from your document:\n\n${top.map((s, i) => `${i + 1}. ${s}`).join('\n\n')}`;
        };

        const offlineAnswer = buildOfflineAnswer(queryText, localDocText);
        if (offlineAnswer) {
          const offlineMsg = {
            id: Date.now(), role: 'model',
            detailedContent: offlineAnswer,
            spokenSummary: 'Offline mode: showing matching passages from your document.'
          };
          set((state) => ({ messages: [...state.messages, offlineMsg], isLoading: false }));
          speak('Offline mode. Showing matching passages from your document.');
          return;
        }
      }

      // Final fallback
      set((state) => ({ 
        messages: [...state.messages, { id: Date.now(), role: 'model', detailedContent: navigator.onLine ? 'Sorry, the AI service encountered an error. Please try again.' : '⚠️ You appear to be offline and no document text is cached yet. Please upload your document while online first.' }],
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
