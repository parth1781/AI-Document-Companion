import React, { useState, useEffect } from 'react';
import DocumentViewer from './DocumentViewer';
import ChatPanel from './ChatPanel';
import { BookMarked, ArrowUpRight } from 'lucide-react';
import axios from 'axios';
import { useChatStore } from '../store/chatStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { API_URL } from '../config';

function StudySpace() {
  const [documentId, setDocumentId] = useState(null);
  const [docContent, setDocContent] = useState('');
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const sendQuery = useChatStore((state) => state.sendQuery);
  const pushLocalMessage = useChatStore((state) => state.pushLocalMessage);
  const loadSession = useChatStore((state) => state.loadSession);
  const [pastDocs, setPastDocs] = useState([]);

  useEffect(() => {
    const sharedId = searchParams.get('session');
    if (sharedId && !documentId) {
      axios.get(`${API_URL}/api/session/${sharedId}`).then(res => {
        setDocContent(res.data.document);
        setDocumentId(sharedId);
        loadSession(res.data.chats);
      }).catch(err => console.error("Failed to load shared session:", err));
    }
  }, [searchParams, documentId, loadSession]);

  const handleAskAction = async (type, selectedText) => {
    if (!selectedText) return;
    if (type === 'ask') {
      sendQuery(`Regarding this quote: "${selectedText}". Could you explain it further?`, documentId);
    } else if (type === 'eli5') {
      sendQuery(`ELI5 (Explain Like I'm 5) the following quote: "${selectedText}"`, documentId);
    } else if (type === 'note') {
      const userNote = window.prompt('Enter your personal note for this highlight:');
      if (userNote) {
        try {
          await axios.post(`${API_URL}/api/notes`, { documentId, highlightedText: selectedText, noteText: userNote });
          pushLocalMessage(`Note saved for "${selectedText}": ${userNote}`);
        } catch (error) { alert('Failed to save note'); }
      }
    }
  };

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const res = await axios.get(`${API_URL}/api/documents`, { headers: { Authorization: `Bearer ${token}` } });
          setPastDocs(res.data.documents);
        }
      } catch (err) { console.error(err); }
    };
    fetchDocs();
  }, []);

  /* ── MOBILE LAYOUT ─────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Horizontal session strip */}
        <div className="mobile-sessions-strip">
          <h4>Sessions</h4>
          <div className="mobile-sessions-list">
            <button className="mobile-new-btn" onClick={() => window.location.href = '/study'}>
              <ArrowUpRight size={14} /> New
            </button>
            {pastDocs.map(d => (
              <button
                key={d._id}
                className={`mobile-session-chip${documentId === d._id ? ' active' : ''}`}
                onClick={() => window.location.href = `/study?session=${d._id}`}
              >
                <BookMarked size={12} />
                {d.originalName}
              </button>
            ))}
            {pastDocs.length === 0 && <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', alignSelf: 'center' }}>No sessions yet</span>}
          </div>
        </div>

        {/* Document Panel */}
        <div className="mobile-panel">
          <DocumentViewer
            setDocument={setDocumentId}
            onAskAction={handleAskAction}
            externalDocContent={docContent}
          />
        </div>

        {/* Chat Panel */}
        <div className="mobile-panel">
          <ChatPanel documentId={documentId} />
        </div>
      </div>
    );
  }

  /* ── DESKTOP LAYOUT ────────────────────────────────── */
  return (
    <div className="page-container">
      {/* Session History Sidebar */}
      <div className="session-sidebar">
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={() => window.location.href = '/study'}>
             <ArrowUpRight size={16} /> New Session
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '0.5rem', letterSpacing: '0.5px' }}>Session History</h4>
          {pastDocs.map(d => (
             <button 
               key={d._id} 
               onClick={() => window.location.href = `/study?session=${d._id}`}
               style={{
                 display: 'flex', alignItems: 'center', gap: '8px',
                 width: '100%', textAlign: 'left', padding: '0.75rem', 
                 background: documentId === d._id ? '#eef2ff' : 'transparent', 
                 color: documentId === d._id ? 'var(--primary)' : 'var(--text-main)',
                 border: 'none', borderRadius: '8px', cursor: 'pointer',
                 transition: 'all 0.2s', fontSize: '0.9rem', fontWeight: documentId === d._id ? 600 : 400
               }}
             >
               <BookMarked size={16} />
               <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{d.originalName}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(d.uploadedAt).toLocaleDateString()}</span>
               </div>
             </button>
          ))}
          {pastDocs.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>No past sessions</p>}
        </div>
      </div>

      <main className="page-main">
        <DocumentViewer 
          setDocument={setDocumentId} 
          onAskAction={handleAskAction}
          externalDocContent={docContent}
        />
        <ChatPanel documentId={documentId} />
      </main>
    </div>
  );
}

export default StudySpace;
