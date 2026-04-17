import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Hero from './components/Hero';
import StudySpace from './components/StudySpace';
import Forum from './components/Forum';
import Builder from './components/Builder';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

import { Compass, Users, Hammer, BookOpen, LogOut } from 'lucide-react';

const GlobalNav = () => {
  const { user, logout } = useAuth();

  if (!user) return null; // Only show nav when logged in (or we can show a simpler one)

  return (
    <header className="navbar">
      <Link to="/" className="nav-brand">
        <Compass color="var(--primary)" size={28} /> AI Platform
      </Link>
      <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <Link to="/study" className="nav-link"><BookOpen size={16} /> Study</Link>
        <Link to="/forum" className="nav-link"><Users size={16} /> Forum</Link>
        <Link to="/builder" className="nav-link"><Hammer size={16} /> Builder</Link>
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{user.name}</span>
          <button onClick={logout} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            <LogOut size={14} style={{ marginRight: '4px' }} /> Log Out
          </button>
        </div>
      </nav>
    </header>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Nav for Home page
const HomeNav = () => {
  const { user } = useAuth();
  return (
    <header className="navbar" style={{ background: 'transparent', borderBottom: 'none', position: 'absolute', width: '100%', top: 0, zIndex: 100 }}>
      <Link to="/" className="nav-brand">
        <Compass color="var(--primary)" size={32} />
      </Link>
      <nav>
        {user ? (
          <Link to="/study" className="btn btn-primary">Go to Dashboard</Link>
        ) : (
          <Link to="/login" className="btn btn-primary">Sign In</Link>
        )}
      </nav>
    </header>
  );
};

function AppContent() {
  const location = useLocation();
  const { loading } = useAuth();
  const isHomePage = location.pathname === '/';
  const isLoginPage = location.pathname === '/login';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-color)', fontSize: '1rem', color: 'var(--text-muted)' }}>
        Authenticating...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-color)' }}>
      {isHomePage ? <HomeNav /> : (!isLoginPage && <GlobalNav />)}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Hero />} />
          <Route path="/study" element={<ProtectedRoute><StudySpace /></ProtectedRoute>} />
          <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
          <Route path="/builder" element={<ProtectedRoute><Builder /></ProtectedRoute>} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
