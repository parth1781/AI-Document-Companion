import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Hammer, FileText, CheckSquare, Layers, ShieldAlert, Clock, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import mermaid from 'mermaid';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const WORKFLOWS = [
  { id: 'prd', label: 'Generate PRD', icon: <FileText size={18} /> },
  { id: 'architecture', label: 'Architecture Plan', icon: <Layers size={18} /> },
  { id: 'scrum', label: 'Scrum Estimation', icon: <CheckSquare size={18} /> },
  { id: 'risk', label: 'Risk Analyzer', icon: <ShieldAlert size={18} /> },
  { id: 'timeline', label: 'Timeline Predictor', icon: <Clock size={18} /> },
];

const Mermaid = ({ text }) => {
  const ref = useRef(null);
  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
    if (ref.current && text) {
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, text).then((result) => {
        ref.current.innerHTML = result.svg;
      }).catch((e) => {
        ref.current.innerHTML = `<pre>${text}</pre><div style="color:red;font-size:0.8rem">Error rendering block diagram</div>`;
      });
    }
  }, [text]);
  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }} />;
};

function Builder() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState('');
  const [activeDoc, setActiveDoc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  
  // Cache state for generated workflows
  const [cache, setCache] = useState({});
  const docRef = useRef(null);

  const [pastSessions, setPastSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const res = await axios.get(`${API_URL}/api/builder/sessions`, { headers: { Authorization: `Bearer ${token}` } });
        setPastSessions(res.data.sessions);
      }
    } catch (err) { console.error('Failed to fetch builder sessions'); }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const loadSession = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        setIsLoading(true);
        const res = await axios.get(`${API_URL}/api/builder/session/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        setSessionId(res.data._id);
        setIdea(res.data.idea);
        setCache(res.data.workflows || {});
        setActiveWorkflow(null);
        setActiveDoc('');
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const runWorkflow = async (workflowId) => {
    const currentIdea = idea.trim();
    if (!currentIdea) {
      alert("Please describe your project idea first.");
      return;
    }
    
    // Check Cache (from session or local)
    if (cache[workflowId]) {
      setActiveWorkflow(workflowId);
      setActiveDoc(cache[workflowId]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setActiveWorkflow(workflowId);
    setActiveDoc('');

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/builder/generate`, {
        sessionId,
        idea: currentIdea,
        workflowType: workflowId
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (!sessionId) { setSessionId(res.data.sessionId); fetchSessions(); }
      
      const generatedContent = res.data.content;
      setActiveDoc(generatedContent);
      setCache(prev => ({ ...prev, [workflowId]: generatedContent }));
    } catch (error) {
      console.error(error);
      setActiveDoc('Failed to generate document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!activeDoc || !docRef.current) return;
    const opt = {
      margin: 1,
      filename: `${activeWorkflow || 'document'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(docRef.current).save();
  };
  
  const downloadMD = () => {
    if (!activeDoc) return;
    const blob = new Blob([activeDoc], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeWorkflow || 'document'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', height: '100%', flex: 1, overflow: 'hidden' }}>
      {/* Session History Sidebar */}
      <div className="session-sidebar" style={{ width: '280px', borderRight: '1px solid var(--border-color)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={() => {
             setSessionId(null); setIdea(''); setCache({}); setActiveDoc(''); setActiveWorkflow(null);
          }}>
             <ArrowLeft size={16} style={{transform: 'rotate(135deg)'}} /> New Project
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '0.5rem', letterSpacing: '0.5px' }}>Past Projects</h4>
          {pastSessions.map(s => (
             <button 
               key={s._id} 
               onClick={() => loadSession(s._id)}
               style={{
                 display: 'flex', alignItems: 'center', gap: '8px',
                 width: '100%', textAlign: 'left', padding: '0.75rem', 
                 background: sessionId === s._id ? '#eef2ff' : 'transparent', 
                 color: sessionId === s._id ? 'var(--primary)' : 'var(--text-main)',
                 border: 'none', borderRadius: '8px', cursor: 'pointer',
                 transition: 'all 0.2s', fontSize: '0.9rem', fontWeight: sessionId === s._id ? 600 : 400
               }}
             >
               <Hammer size={16} />
               <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{s.idea}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(s.lastUpdated).toLocaleDateString()}</span>
               </div>
             </button>
          ))}
          {pastSessions.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>No past projects</p>}
        </div>
      </div>

      <main className="main-layout" style={{ flex: 1, flexDirection: 'column', overflow: 'hidden', padding: '1rem 2rem' }}>
        
        {/* IDEATION CONTEXT */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.75rem', color: 'var(--primary)', fontSize: '1.1rem' }}>Project Ideation</h3>
          <textarea 
            style={{ 
              width: '100%', height: '80px', padding: '1rem', 
              fontFamily: 'inherit', resize: 'none', outline: 'none',
              fontSize: '0.95rem', lineHeight: '1.5', background: '#f8fafc',
              border: '1px solid var(--border-color)', borderRadius: '6px'
            }}
            placeholder="Describe your project idea in detail. What are you building? Who is it for?"
            value={idea}
            onChange={e => setIdea(e.target.value)}
          />
        </div>

        {/* HORIZONTAL WORKFLOW TABS */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {WORKFLOWS.map(w => (
            <button 
              key={w.id} 
              className="btn btn-outline" 
              style={{ 
                padding: '0.75rem 1.5rem',
                border: `1px solid ${activeWorkflow === w.id ? 'var(--primary)' : 'var(--border-color)'}`,
                background: activeWorkflow === w.id ? 'var(--primary)' : 'var(--card-bg)',
                color: activeWorkflow === w.id ? 'white' : 'var(--text-main)',
                cursor: (isLoading || !idea.trim()) ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: activeWorkflow === w.id ? '0 4px 6px -1px rgba(79, 70, 229, 0.2)' : 'none',
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={() => runWorkflow(w.id)}
              disabled={isLoading || !idea.trim()}
            >
              <span style={{ marginRight: '0.5rem', display: 'flex', alignItems: 'center' }}>
                {w.icon}
              </span>
              {w.label}
              {isLoading && activeWorkflow === w.id && <span style={{ marginLeft: '0.5rem', fontStyle: 'italic', opacity: 0.8 }}>(wait)</span>}
            </button>
          ))}
        </div>

        {/* DOCUMENT VIEW */}
        <div className="card chat-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-header" style={{ justifyContent: 'space-between', display: 'flex' }}>
            <div>
              <span>Generated Documentation</span>
              {activeWorkflow && <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginLeft: '1rem' }}>{WORKFLOWS.find(w => w.id === activeWorkflow)?.label}</span>}
            </div>
            
            {activeDoc && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" onClick={downloadMD} style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>
                  <Download size={14} style={{ marginRight: '4px' }}/> .MD
                </button>
                <button className="btn btn-primary" onClick={downloadPDF} style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>
                  <Download size={14} style={{ marginRight: '4px' }}/> .PDF
                </button>
              </div>
            )}
          </div>
          <div className="chat-history detailed-markdown" style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            {activeDoc ? (
              <div ref={docRef} style={{ padding: '1rem', background: 'white', color: '#1a1a1a' }}>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '');
                      if (!inline && match && match[1] === 'mermaid') {
                        return <Mermaid text={String(children).replace(/\n$/, '')} />;
                      }
                      return <code className={className} {...props}>{children}</code>;
                    }
                  }}
                >
                  {activeDoc}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
                {isLoading ? 'Architecting your document...' : 'Execute a workflow above to generate professional technical documentation.'}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Builder;
