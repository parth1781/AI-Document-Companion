import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, MessageSquare, BookOpen, Lightbulb } from 'lucide-react';
import axios from 'axios';
import { Virtuoso } from 'react-virtuoso';
import { useChatStore } from '../store/chatStore';

import { API_URL } from '../config';

const DocumentViewer = ({ setDocument, onAskAction, externalDocContent }) => {
  const [docText, setDocText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [toolbarPos, setToolbarPos] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const setDocumentText = useChatStore(state => state.setDocumentText);
  const contentRef = useRef(null);

  useEffect(() => {
    if (externalDocContent) {
      setDocText(externalDocContent);
      setDocumentText(externalDocContent); // cache for offline
    }
  }, [externalDocContent]);



  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocText(res.data.text);
      setDocumentText(res.data.text); // cache for offline search
      setDocument(res.data.documentId);
    } catch (error) {
      alert('Error uploading file: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text.length > 0 && contentRef.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const parentRect = contentRef.current.getBoundingClientRect();
      
      setToolbarPos({
        top: rect.top - parentRect.top - 10,
        left: rect.left - parentRect.left + (rect.width / 2)
      });
      setSelectedText(text);
    } else {
      setToolbarPos(null);
      setSelectedText('');
    }
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handleAction = (type) => {
    onAskAction(type, selectedText);
    window.getSelection().removeAllRanges();
    setToolbarPos(null);
  };

  const paragraphs = docText.split('\n').filter(p => p.trim() !== '');

  return (
    <div className="card document-panel">
      <div className="panel-header">
        <span>Document Outline</span>
      </div>
      
      {!docText ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
          <label className="upload-area" style={{ width: '100%' }}>
            <UploadCloud size={48} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
            <h3>Upload Document</h3>
            <p>Supports .txt, .pdf, .docx</p>
            <input type="file" hidden accept=".txt,.pdf,.docx,.doc" onChange={handleFileUpload} />
            {isUploading && <p style={{ marginTop: '1rem', color: 'var(--accent)' }}>Uploading & extracting...</p>}
          </label>
        </div>
      ) : (
        <div 
          className="document-content" 
          ref={contentRef} 
          style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
        >
          <div style={{ flex: 1, height: '100%' }}>
            <Virtuoso
              style={{ height: '100%' }}
              data={paragraphs}
              itemContent={(index, p) => (
                <p key={index} style={{ marginBottom: '1em', lineHeight: '1.6' }}>
                  {p}
                </p>
              )}
            />
          </div>
          
          {toolbarPos && (
            <div 
              className="highlight-toolbar" 
              style={{ top: toolbarPos.top, left: toolbarPos.left, position: 'absolute' }}
              onMouseDown={(e) => e.preventDefault()} // Keep selection
            >
              <button className="toolbar-btn" onClick={() => handleAction('ask')} title="Ask AI about this">
                <MessageSquare size={16} /> Ask
              </button>
              <button className="toolbar-btn" onClick={() => handleAction('eli5')} title="Explain Like I'm 5">
                <Lightbulb size={16} /> ELI5
              </button>
              <button className="toolbar-btn" onClick={() => handleAction('note')} title="Save Note">
                <BookOpen size={16} /> Note
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentViewer;
