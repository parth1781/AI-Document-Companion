import React, { useState, useRef, useEffect } from 'react';
import { Send, Volume2, BookCheck, ClipboardList, Download, StickyNote, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { useChatStore } from '../store/chatStore';
import html2pdf from 'html2pdf.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const QuizModule = ({ quizData }) => {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const addQuizMistake = useChatStore(state => state.addQuizMistake);

  const handleSelect = (idx, opt) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [idx]: opt }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    let score = 0;
    quizData.forEach((q, idx) => {
      if (answers[idx] !== q.correctAnswer) {
        addQuizMistake(q.question, answers[idx] || 'No Answer', q.correctAnswer);
      } else {
        score++;
      }
    });
  };

  return (
    <div className="quiz-module" style={{ width: '100%', background: 'white', padding: '1rem', borderRadius: '12px' }}>
      <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Knowledge Check: MCQ Quiz</h3>
      {quizData.map((q, i) => (
        <div key={i} className="quiz-card" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '1.05rem' }}>{i + 1}. {q.question}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {q.options.map((opt, oIdx) => {
              const isSelected = answers[i] === opt;
              const isCorrect = submitted && opt === q.correctAnswer;
              const isWrong = submitted && isSelected && opt !== q.correctAnswer;
              
              let bg = 'var(--card-bg)';
              let border = 'var(--border-color)';
              if (isSelected) { bg = '#eef2ff'; border = 'var(--primary)'; }
              if (isCorrect) { bg = '#dcfce7'; border = '#22c55e'; }
              if (isWrong) { bg = '#fee2e2'; border = '#ef4444'; }

              return (
                <button 
                  key={oIdx} 
                  onClick={() => handleSelect(i, opt)}
                  style={{ padding: '0.75rem', borderRadius: '6px', border: `2px solid ${border}`, background: bg, textAlign: 'left', cursor: submitted ? 'default' : 'pointer', transition: 'all 0.2s', fontWeight: 500 }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!submitted && <button className="btn btn-primary" onClick={handleSubmit} style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', fontSize: '1rem' }}>Submit Answers</button>}
      {submitted && <div style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--primary)', textAlign: 'center', padding: '1rem', background: '#eef2ff', borderRadius: '8px' }}>Mistakes have been logged to your session summary algorithm!</div>}
    </div>
  );
};

const ChatPanel = ({ documentId }) => {
  const { messages, notes, quizMistakes, isLoading, sendQuery, setMessages } = useChatStore();
  const [input, setInput] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showNotes]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const currentInput = input;
    setInput('');
    sendQuery(currentInput, documentId);
  };

  const generateVisualSummary = async () => {
    if (!documentId) return;
    const { localSummaryInsights, notes, quizMistakes } = useChatStore.getState();
    
    let markdown = "## Algorithmic Study Summary\n\n";
    if (localSummaryInsights.length === 0 && notes.length === 0) {
      markdown += "You haven't requested any explanations (ELI5) or saved notes yet! Highlight some text and learn to build your algorithmic summary.\n";
    } else {
      if (localSummaryInsights.length > 0) {
        markdown += "### Key Learnings (ELI5)\n";
        localSummaryInsights.forEach((item, idx) => {
          markdown += `**${idx + 1}. ${item.query}**\n${item.insight}\n\n`;
        });
      }
      if (notes.length > 0) {
        markdown += "### Saved Notes\n";
        notes.forEach((note, idx) => {
          markdown += `- ${note}\n`;
        });
        markdown += "\n";
      }
      if (quizMistakes.length > 0) {
        markdown += "### Areas to Review\n";
        quizMistakes.forEach((mistake, idx) => {
          markdown += `- **Missed:** ${mistake.question} (Correct: ${mistake.correctAnswer})\n`;
        });
      }
    }

    setMessages(prev => [...prev, {
      id: Date.now(), role: 'model',
      detailedContent: markdown,
      spokenSummary: "I've generated a local algorithmic summary based on your recent activity."
    }]);
  };

  const generateDigitalSummary = async () => {
    if (!documentId) return;
    setMessages(prev => [...prev, { id: Date.now(), role: 'model', detailedContent: 'Generating digital summaries...', isTemp: true }]);
    try {
      const res = await axios.post(`${API_URL}/api/study/summary-cards/${documentId}`);
      setMessages(prev => prev.filter(m => !m.isTemp).concat({
        id: Date.now(), role: 'model',
        detailedContent: res.data.summaries,
        spokenSummary: "I've generated digital summary infographics for quick revision."
      }));
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.filter(m => !m.isTemp).concat({ id: Date.now(), role: 'model', detailedContent: 'Failed to generate summaries.' }));
    }
  };

  const generateFlashcards = () => {
    if (!documentId) return;
    const { localSummaryInsights, notes, messages: allMsgs, localDocText } = useChatStore.getState();

    const flashcards = [];
    const seen = new Set(); // deduplicate by question

    const addCard = (q, a, color) => {
      const key = q.slice(0, 60).toLowerCase();
      if (!seen.has(key) && a && a.trim().length > 10) {
        seen.add(key);
        flashcards.push({ question: q, answer: a.trim().slice(0, 350), themeColor: color });
      }
    };

    // --- Layer 1: ELI5 insights → Q&A cards ---
    localSummaryInsights.forEach(item => {
      const sentences = item.insight.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/);
      addCard(`Explain: ${item.query}`, sentences.slice(0, 2).join(' ') || item.insight, '#4f46e5');
    });

    // --- Layer 2: ALL user chat messages paired with AI replies ---
    allMsgs.forEach((msg, idx) => {
      if (msg.role !== 'user' || !msg.content || msg.content.length < 8) return;
      const modelReply = allMsgs[idx + 1];
      if (modelReply?.role === 'model' && typeof modelReply.detailedContent === 'string') {
        const clean = modelReply.detailedContent.replace(/[#*`>]/g, '').replace(/\n+/g, ' ');
        const sentences = clean.split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
        addCard(msg.content, sentences.slice(0, 2).join(' '), '#0891b2');
      }
    });

    // --- Layer 3: Notes → recall cards ---
    notes.forEach(note => {
      addCard(`What concept does this describe?\n"${note.slice(0, 100)}"`, note, '#059669');
    });

    // --- Layer 4: Bold terms from AI messages ---
    const allAiText = allMsgs
      .filter(m => m.role === 'model' && typeof m.detailedContent === 'string')
      .map(m => m.detailedContent)
      .join('\n');

    const boldTerms = [...allAiText.matchAll(/\*\*(.{3,40}?)\*\*/g)].map(m => m[1]).filter(Boolean);
    const aiSentences = allAiText.replace(/[#*`>]/g, '').split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 40);
    const usedTerms = new Set();
    boldTerms.forEach(term => {
      if (usedTerms.has(term.toLowerCase())) return;
      usedTerms.add(term.toLowerCase());
      const ctx = aiSentences.find(s => s.toLowerCase().includes(term.toLowerCase()));
      if (ctx) addCard(`What is "${term}"?`, ctx.trim(), '#7c3aed');
    });

    // --- Layer 5: Mine the actual document text for key sentences ---
    if (flashcards.length < 5 && localDocText && localDocText.length > 200) {
      const docSentences = localDocText
        .replace(/\r\n/g, '\n')
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 60 && s.length < 400);

      // Score by information density: prefer sentences with numbers, proper nouns, colons
      const scored = docSentences.map(s => ({
        s,
        score: (s.match(/\d+/g) || []).length * 2 +
               (s.match(/[A-Z][a-z]{2,}/g) || []).length +
               (s.includes(':') ? 3 : 0) +
               (s.includes('is') || s.includes('are') || s.includes('means') ? 2 : 0)
      }));

      scored.sort((a, b) => b.score - a.score);

      scored.slice(0, 8).forEach(({ s }, i) => {
        // Turn dense sentence into a fill-in-blank or recall card
        const words = s.split(' ');
        if (words.length > 6) {
          const keyWord = words.find(w => w.length > 5 && /^[A-Z]/.test(w)) || words[3];
          addCard(
            `Complete the concept: "${s.replace(keyWord, '______')}"`,
            `Answer: ${keyWord}\n\nFull context: ${s}`,
            '#d97706'
          );
        }
      });
    }

    if (flashcards.length === 0) {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'model',
        detailedContent: '📚 No flashcards yet! Ask a few questions or use ELI5 on highlighted text first — then hit Flashcards again.',
        spokenSummary: 'Ask some questions first to build flashcard content.'
      }]);
      return;
    }

    setMessages(prev => [...prev, {
      id: Date.now(), role: 'model',
      detailedContent: flashcards,
      spokenSummary: `Generated ${flashcards.length} flashcards from your session — no API used!`
    }]);
  };

  const generateQuiz = async () => {
    if (!documentId) return;
    setMessages(prev => [...prev, { id: Date.now(), role: 'model', detailedContent: 'Creating MCQ quiz...', isTemp: true }]);
    try {
      const res = await axios.post(`${API_URL}/api/study/quiz/${documentId}`);
      setMessages(prev => prev.filter(m => !m.isTemp).concat({
        id: Date.now(), role: 'model',
        detailedContent: res.data.quizzes,
        spokenSummary: "Here's a multiple-choice quiz to test your knowledge."
      }));
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.filter(m => !m.isTemp).concat({ id: Date.now(), role: 'model', detailedContent: 'Failed to generate quiz.' }));
    }
  };

  const downloadPDFSummary = () => {
    const htmlString = `
      <div style="font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto;">
        <h1 style="color: #4f46e5; text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">Study Session Report</h1>
        
        <div style="margin-top: 30px;">
          <h2 style="color: #0f172a; display: flex; align-items: center; gap: 10px;">
            <div style="width:12px; height:12px; background:#10b981; border-radius:50%;"></div> Discussion Topics
          </h2>
          ${messages.filter(m => m.role === 'user' && !m.isHidden).length > 0 
            ? messages.filter(m => m.role === 'user' && !m.isHidden).map((m, i) => `<div style="padding: 10px; background: #f1f5f9; border-radius: 4px; margin-bottom: 8px;"><strong>${i+1}.</strong> ${m.content}</div>`).join('') 
            : '<p>No topics discussed yet.</p>'}
        </div>

        <div style="margin-top: 30px;">
          <h2 style="color: #0f172a; display: flex; align-items: center; gap: 10px;">
            <div style="width:12px; height:12px; background:#4f46e5; border-radius:50%;"></div> Quick Saved Notes
          </h2>
          ${notes.length > 0 ? notes.map(n => `<div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; margin-bottom: 10px; border-radius: 4px;">${n}</div>`).join('') : '<p>No notes saved during this session.</p>'}
        </div>

        <div style="margin-top: 40px; page-break-before: always;">
          <h2 style="color: #0f172a; display: flex; align-items: center; gap: 10px;">
            <div style="width:12px; height:12px; background:#ef4444; border-radius:50%;"></div> Quiz Mistakes to Review
          </h2>
          ${quizMistakes.length > 0 ? quizMistakes.map(m => `
            <div style="border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 15px; background: white;">
              <p style="font-weight: bold; margin-bottom: 10px; color: #1e293b;">Q: ${m.question}</p>
              <div style="color: #ef4444; margin-bottom: 5px; text-decoration: line-through;">You answered: ${m.wrongAnswer}</div>
              <div style="color: #22c55e; font-weight: bold;">Correct: ${m.correctAnswer}</div>
            </div>
          `).join('') : '<p>Perfect! No quiz mistakes recorded.</p>'}
        </div>
        
        <div style="margin-top: 40px; text-align: center; color: #64748b; font-size: 0.85rem;">
          <p>Dynamically generated by your AI Learning Companion.</p>
        </div>
      </div>
    `;

    const el = document.createElement('div');
    el.innerHTML = htmlString;
    const opt = {
      margin: 0.5,
      filename: `Session_Summary_${new Date().toISOString().slice(0,10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(el).save();
  };

  const copyShareLink = () => {
    if (!documentId) return;
    const url = `${window.location.origin}/study?session=${documentId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Share link copied to clipboard!');
    });
  };

  return (
    <div className="card chat-panel" style={{ position: 'relative' }}>
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ fontWeight: 700 }}>Learning Hub Agent</span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={copyShareLink} disabled={!documentId} title="Share Session">
            <LinkIcon size={14} style={{ marginRight: '4px' }}/> Share Link
          </button>
          
          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={generateVisualSummary} disabled={!documentId || isLoading}>
            <ImageIcon size={14} style={{ marginRight: '4px' }}/> Summary
          </button>
          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={generateDigitalSummary} disabled={!documentId || isLoading}>
            <ClipboardList size={14} style={{ marginRight: '4px' }}/> Cards
          </button>
          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={generateFlashcards} disabled={!documentId || isLoading}>
            <BookCheck size={14} style={{ marginRight: '4px' }}/> Flashcards
          </button>
          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={generateQuiz} disabled={!documentId || isLoading}>
            <BookCheck size={14} style={{ marginRight: '4px' }}/> MCQ Quiz
          </button>
          
          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: showNotes ? 'var(--primary)' : 'transparent', color: showNotes ? 'white' : 'var(--primary)' }} onClick={() => setShowNotes(!showNotes)} title="Saved Notes">
            <StickyNote size={14} style={{ marginRight: '4px' }}/> Notes ({notes.length})
          </button>
          <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={downloadPDFSummary} title="Download Report">
            <Download size={14} style={{ marginRight: '4px' }}/> Export PDF
          </button>
        </div>
      </div>
      
      <div className="chat-history" style={{ display: 'flex' }}>
        
        {/* Main Chat Area */}
        <div style={{ flex: 1, paddingRight: showNotes ? '1rem' : '0', overflowY: 'auto' }}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              {msg.role === 'model' ? (
                <>
                  {msg.spokenSummary && (
                    <div className="spoken-summary" style={{ marginBottom: '0.5rem' }}>
                      <Volume2 size={16} />
                      <span style={{ fontSize: '0.85rem' }}>{msg.spokenSummary}</span>
                    </div>
                  )}
                  <div className="detailed-markdown" style={{ width: '100%' }}>
                    {Array.isArray(msg.detailedContent) ? (
                      msg.detailedContent[0]?.options ? (
                        <QuizModule quizData={msg.detailedContent} />
                      ) : msg.detailedContent[0]?.topic ? (
                        <div className="flashcards-grid">
                          {msg.detailedContent.map((card, i) => (
                            <div key={i} className="flashcard-ui" style={{ borderTop: `6px solid ${card.themeColor || 'var(--primary)'}` }}>
                              <div className="q-label" style={{ background: card.themeColor, color: 'white', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600 }}>TOPIC</div>
                              <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-main)' }}>{card.topic}</h4>
                              <div className="a-label">KEY TAKEAWAYS</div>
                              <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                                {card.keyPoints && card.keyPoints.map((kp, kpi) => (
                                  <li key={kpi} style={{ marginBottom: '0.25rem' }}>{kp}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flashcards-grid">
                          {msg.detailedContent.map((card, i) => (
                            <div key={i} className="flashcard-ui" style={{ borderTop: `4px solid ${card.themeColor || 'var(--primary)'}` }}>
                              <div className="q-label">Question {i + 1}</div>
                              <h4>{card.question}</h4>
                              <div className="a-label">Answer</div>
                              <p>{card.answer}</p>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({node, ...props}) => <a target="_blank" rel="noopener noreferrer" {...props} /> }}>{msg.detailedContent}</ReactMarkdown>
                    )}
                  </div>
                </>
              ) : (
                <div>{msg.content}</div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="message ai">
              <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Working on it...</span>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>

        {/* Saved Notes Drawer Side Panel */}
        {showNotes && (
          <div style={{ width: '300px', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem', overflowY: 'auto', background: '#f8fafc', padding: '1rem', borderRadius: '0 0 12px 0' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><StickyNote size={16}/> Saved Notes Drawer</h3>
            {notes.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Highlight text in the document and click 'Eli5 & Add Note' to save important points here.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notes.map((n, i) => (
                  <div key={i} style={{ padding: '0.75rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    {n}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <form className="chat-input-area" onSubmit={handleSubmit}>
        <div className="chat-input-form">
          <input 
            type="text" 
            className="chat-input" 
            placeholder={documentId ? "Ask a question..." : "Upload a document first"} 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!documentId}
          />
          <button type="submit" className="btn btn-icon" disabled={!documentId || isLoading || !input.trim()}>
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
