import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import './mobile.css';
import Hero from './components/Hero';
import StudySpace from './components/StudySpace';
import Forum from './components/Forum';
import Builder from './components/Builder';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useIsMobile } from './hooks/useIsMobile';

import { Compass, Users, Hammer, BookOpen, LogOut } from 'lucide-react';

/* ── Desktop Navbar ─────────────────────────────────────── */
const GlobalNav = () => {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <header className="navbar">
      <Link to="/" className="nav-brand">
        <Compass size={28} /> Learning Hub
      </Link>
      <nav className="nav-links">
        <Link to="/study" className="nav-link"><BookOpen size={16} /> Study</Link>
        <Link to="/forum" className="nav-link"><Users size={16} /> Forum</Link>
        <Link to="/builder" className="nav-link"><Hammer size={16} /> Build</Link>
        <div className="nav-separator"></div>
        <div className="nav-user-menu">
          <span className="nav-user-name">{user.name}</span>
          <button onClick={logout} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            <LogOut size={14} style={{ marginRight: '4px' }} /> Log Out
          </button>
        </div>
      </nav>
    </header>
  );
};

/* ── Mobile Navbar ───────────────────────────────────────── */
const MobileNav = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  if (!user) return null;
  return (
    <header className="mobile-navbar">
      <Link to="/" className="mobile-nav-brand">
        <Compass size={22} /> Hub
      </Link>
      <div className="mobile-nav-links">
        <Link to="/study" className={`mobile-nav-link${location.pathname === '/study' ? ' active' : ''}`}>
          <BookOpen size={14} /> Study
        </Link>
        <Link to="/forum" className={`mobile-nav-link${location.pathname === '/forum' ? ' active' : ''}`}>
          <Users size={14} /> Forum
        </Link>
        <Link to="/builder" className={`mobile-nav-link${location.pathname === '/builder' ? ' active' : ''}`}>
          <Hammer size={14} /> Build
        </Link>
      </div>
      <button onClick={logout} className="mobile-logout-btn">
        <LogOut size={14} />
      </button>
    </header>
  );
};

/* ── Home / Public Nav ───────────────────────────────────── */
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

/* ── Protected Route ─────────────────────────────────────── */
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

/* ── App Content ─────────────────────────────────────────── */
function AppContent() {
  const location = useLocation();
  const { loading } = useAuth();
  const isMobile = useIsMobile();

  const isHomePage = location.pathname === '/';
  const isLoginPage = location.pathname === '/login';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-color)', fontSize: '1rem', color: 'var(--text-muted)' }}>
        Authenticating...
      </div>
    );
  }

  /* ── MOBILE LAYOUT ── */
  if (isMobile) {
    return (
      <div className="mobile-body">
        {isHomePage ? <HomeNav /> : (!isLoginPage && <MobileNav />)}
        <div className="mobile-page">
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

  /* ── DESKTOP LAYOUT ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-color)' }}>
      {isHomePage ? <HomeNav /> : (!isLoginPage && <GlobalNav />)}
      <div className="app-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
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
