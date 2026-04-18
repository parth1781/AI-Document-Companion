import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpRight, Users, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { useIsMobile } from '../hooks/useIsMobile';
import { API_URL } from '../config';

const PERSONAS = [
  { id: 'default', name: 'The Intellectual' },
  { id: 'devil', name: "Devil's Advocate" },
  { id: 'socratic', name: 'Socratic Tutor' },
  { id: 'lateral', name: 'Lateral Thinker' },
  { id: 'synthesizer', name: 'The Synthesizer' },
  { id: 'pragmatist', name: 'The Pragmatist' }
];

function Forum() {
  const isMobile = useIsMobile();

  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [activePersona, setActivePersona] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef(null);

  const [pastSessions, setPastSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const res = await axios.get(`${API_URL}/api/forum/sessions`, { headers: { Authorization: `Bearer ${token}` } });
        setPastSessions(res.data.sessions);
      }
    } catch (err) { console.error('Failed to fetch forum sessions'); }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const loadSession = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        setIsLoading(true);
        const res = await axios.get(`${API_URL}/api/forum/session/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        setSessionId(res.data._id);
        setTopic(res.data.topic);
        setMessages(res.data.history);
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const triggerPersonaReply = async (personaId, currentTopic, currentMessages) => {
    if (!currentTopic.trim()) {
      alert("Please enter a Topic Context first!");
      return;
    }
    setIsLoading(true);
    setActivePersona(personaId);

    const autoPrompt = `(System Topic context: "${currentTopic}"). The user has passed the floor to you to continue the discussion. Please share your deep insights now based on your persona.`;
    const tempMsg = { role: 'user', content: autoPrompt, isHidden: true };
    const history = [...currentMessages, tempMsg].filter(m => !m.isHidden);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/forum/chat`, {
        sessionId,
        topic: currentTopic,
        message: autoPrompt,
        persona: personaId,
        history
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (!sessionId) { setSessionId(res.data.sessionId); fetchSessions(); }

      setMessages(prev => [...prev, {
        role: 'model',
        content: res.data.content,
        persona: personaId
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: 'Connection failed.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonaTabClick = (personaId) => {
    triggerPersonaReply(personaId, topic, messages);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !topic.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setInput('');

    const history = messages.filter(m => !m.isHidden);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/forum/chat`, {
        sessionId,
        topic,
        message: userMsg.content,
        persona: activePersona,
        history
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (!sessionId) { setSessionId(res.data.sessionId); fetchSessions(); }

      setMessages(prev => [...prev, {
        role: 'model',
        content: res.data.content,
        persona: activePersona
      }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  /* Shared chat messages JSX */
  const ChatMessages = () => (
    <>
      {messages.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
          Enter a topic above, then tap a Persona to start!
        </div>
      )}
      {messages.filter(m => !m.isHidden).map((msg, idx) => (
        <div key={idx} className={`message ${msg.role}`} style={{ maxWidth: '90%' }}>
          {msg.role === 'model' && msg.persona && (
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              {PERSONAS.find(p => p.id === msg.persona)?.name || msg.persona}
            </div>
          )}
          {msg.role === 'model' ? (
            <div className="detailed-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({node, ...props}) => <a target="_blank" rel="noopener noreferrer" {...props} /> }}>{msg.content}</ReactMarkdown></div>
          ) : (
            <div>{msg.content}</div>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="message ai">
          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{PERSONAS.find(p => p.id === activePersona)?.name || 'Agent'} is typing...</span>
        </div>
      )}
      <div ref={endRef} />
    </>
  );

  /* ── MOBILE LAYOUT ─────────────────────────────────── */
  if (isMobile) {
    return (
      <div className="mobile-screen">
        {/* Session chips strip */}
        <div className="mobile-sessions-strip">
          <h4>Discussions</h4>
          <div className="mobile-sessions-list">
            <button className="mobile-new-btn" onClick={() => { setSessionId(null); setTopic(''); setMessages([]); }}>
              <ArrowUpRight size={13} /> New
            </button>
            {pastSessions.map(s => (
              <button key={s._id} className={`mobile-session-chip${sessionId === s._id ? ' active' : ''}`} onClick={() => loadSession(s._id)}>
                <Users size={11} />{s.topic}
              </button>
            ))}
          </div>
        </div>

        {/* Topic input */}
        <div className="mobile-input-card">
          <h3>Topic Context</h3>
          <textarea className="mobile-textarea" placeholder="Paste a topic, article, or idea here..." value={topic} onChange={e => setTopic(e.target.value)} />
        </div>

        {/* Persona tabs */}
        <div className="mobile-tabs-strip">
          {PERSONAS.map(p => (
            <button key={p.id} className={`mobile-tab-btn${activePersona === p.id ? ' active' : ''}`}
              onClick={() => handlePersonaTabClick(p.id)} disabled={isLoading || !topic.trim()}>
              {p.name}
            </button>
          ))}
        </div>

        {/* Chat area - scrollable */}
        <div className="mobile-chat-area">
          <div className="mobile-chat-history">
            {messages.length === 0 && (
              <div className="mobile-placeholder">
                <Users size={40} />
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>Start a Discussion</strong>
                <span>Enter a topic above, then tap a Persona to invite them to speak.</span>
              </div>
            )}
            <ChatMessages />
          </div>

          {/* Fixed bottom input bar */}
          <form className="mobile-input-bar" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder={topic ? "Add your thoughts..." : "Enter a topic first..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading || !topic.trim()}
            />
            <button type="submit" className="mobile-send-btn" disabled={!input.trim() || isLoading || !topic.trim()}>
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    );
  }


  /* ── DESKTOP LAYOUT ────────────────────────────────── */
  return (
    <div className="page-container">
      <div className="session-sidebar">
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={() => { setSessionId(null); setTopic(''); setMessages([]); }}>
             <ArrowUpRight size={16} /> New Discussion
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '0.5rem', letterSpacing: '0.5px' }}>Past Discussions</h4>
          {pastSessions.map(s => (
             <button key={s._id} onClick={() => loadSession(s._id)}
               style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '0.75rem', 
                 background: sessionId === s._id ? '#eef2ff' : 'transparent', color: sessionId === s._id ? 'var(--primary)' : 'var(--text-main)',
                 border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem', fontWeight: sessionId === s._id ? 600 : 400 }}>
               <Users size={16} />
               <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{s.topic}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(s.lastUpdated).toLocaleDateString()}</span>
               </div>
             </button>
          ))}
          {pastSessions.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>No past discussions</p>}
        </div>
      </div>

      <main className="page-main" style={{ flexDirection: 'column', overflow: 'hidden', padding: '1rem 2rem' }}>
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.75rem', color: 'var(--primary)', fontSize: '1.1rem' }}>Topic Context</h3>
          <textarea style={{ width: '100%', height: '80px', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'none', fontFamily: 'inherit', outline: 'none', background: '#f8fafc' }}
            placeholder="Paste a blog post, article, or general topic here..." value={topic} onChange={e => setTopic(e.target.value)} />
        </div>
        <div className="tabs-row" style={{ display: 'flex', marginBottom: '1rem' }}>
          {PERSONAS.map(p => (
            <button key={p.id} onClick={() => handlePersonaTabClick(p.id)} disabled={isLoading || !topic.trim()}
              style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: `1px solid ${activePersona === p.id ? 'var(--primary)' : 'var(--border-color)'}`,
                background: activePersona === p.id ? 'var(--primary)' : 'var(--card-bg)', color: activePersona === p.id ? 'white' : 'var(--text-main)',
                cursor: (isLoading || !topic.trim()) ? 'not-allowed' : 'pointer', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
              Ask {p.name}
            </button>
          ))}
        </div>
        <div className="card chat-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="chat-history" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}><ChatMessages /></div>
          <form className="chat-input-area" onSubmit={handleSubmit}>
            <div className="chat-input-form">
              <input type="text" className="chat-input" placeholder={topic ? "Add your thoughts..." : "Please enter a topic first..."}
                value={input} onChange={e => setInput(e.target.value)} disabled={isLoading || !topic.trim()} />
              <button type="submit" className="btn btn-icon" disabled={!input.trim() || isLoading || !topic.trim()}><Send size={18} /></button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Forum;


