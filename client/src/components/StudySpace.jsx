import React, { useState, useEffect } from 'react';
import DocumentViewer from './DocumentViewer';
import ChatPanel from './ChatPanel';
import { BookMarked, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useChatStore } from '../store/chatStore';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function StudySpace() {
  const [documentId, setDocumentId] = useState(null);
  const [docContent, setDocContent] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const sendQuery = useChatStore((state) => state.sendQuery);
  const pushLocalMessage = useChatStore((state) => state.pushLocalMessage);
  const loadSession = useChatStore((state) => state.loadSession);

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
          await axios.post(`${API_URL}/api/notes`, {
            documentId,
            highlightedText: selectedText,
            noteText: userNote
          });
          pushLocalMessage(`Note saved for "${selectedText}": ${userNote}`);
        } catch (error) {
          alert('Failed to save note');
        }
      }
    }
  };

  const [pastDocs, setPastDocs] = useState([]);

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

  return (
    <div style={{ display: 'flex', height: '100%', flex: 1, overflow: 'hidden' }}>
      {/* Session History Sidebar */}
      <div className="session-sidebar" style={{ width: '280px', borderRight: '1px solid var(--border-color)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={() => window.location.href = '/study'}>
             <ArrowLeft size={16} style={{transform: 'rotate(135deg)'}} /> New Session
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

      <main className="main-layout" style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        <DocumentViewer 
          setDocument={setDocumentId} 
          onAskAction={handleAskAction}
          externalDocContent={docContent}
        />
        <ChatPanel 
          documentId={documentId} 
        />
      </main>
    </div>
  );
}

export default StudySpace;
