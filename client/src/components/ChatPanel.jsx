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
    setMessages(prev => [...prev, { id: Date.now(), role: 'model', detailedContent: 'Generating visual summary...', isTemp: true }]);
    try {
      const res = await axios.post(`${API_URL}/api/study/visual-summary/${documentId}`);
      setMessages(prev => prev.filter(m => !m.isTemp).concat({
        id: Date.now(), role: 'model',
        detailedContent: res.data.summary,
        spokenSummary: "I've generated a beautiful visual summary of the document for you."
      }));
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.filter(m => !m.isTemp).concat({ id: Date.now(), role: 'model', detailedContent: 'Failed to generate visual summary.' }));
    }
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

  const generateFlashcards = async () => {
    if (!documentId) return;
    setMessages(prev => [...prev, { id: Date.now(), role: 'model', detailedContent: 'Creating flashcards...', isTemp: true }]);
    try {
      const res = await axios.post(`${API_URL}/api/flashcards/${documentId}`);
      setMessages(prev => prev.filter(m => !m.isTemp).concat({
        id: Date.now(), role: 'model',
        detailedContent: res.data.flashcards,
        spokenSummary: "I've generated classic flashcards based on the document to test your knowledge."
      }));
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.filter(m => !m.isTemp).concat({ id: Date.now(), role: 'model', detailedContent: 'Failed to generate flashcards.' }));
    }
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
        <span style={{ fontWeight: 700 }}>AI Companion</span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={copyShareLink} disabled={!documentId} title="Share Session">
            <LinkIcon size={14} style={{ marginRight: '4px' }}/> Share Link
          </button>
          
          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={generateVisualSummary} disabled={!documentId || isLoading}>
            <ImageIcon size={14} style={{ marginRight: '4px' }}/> Visual Summary
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
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.detailedContent}</ReactMarkdown>
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
