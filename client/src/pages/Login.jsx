import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, ArrowRight } from 'lucide-react';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate('/study');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <Compass size={28} color="var(--primary)" />
          </div>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create an account'}</h2>
          <p>{mode === 'login' ? 'Sign in to your AI Platform.' : 'Join thousands of learners today.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'register' && (
            <div className="input-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ram Charan"
                required
                className="login-input"
              />
            </div>
          )}
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="login-input"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
              required
              className="login-input"
            />
          </div>

          {error && (
            <div className="auth-error">{error}</div>
          )}

          <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
            {isLoading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
            {!isLoading && <ArrowRight size={16} style={{ marginLeft: '8px' }} />}
          </button>
        </form>

        <div className="login-footer">
          {mode === 'login' ? (
            <p>Don't have an account?{' '}
              <button onClick={() => { setMode('register'); setError(''); }} className="link-btn">Sign up for free</button>
            </p>
          ) : (
            <p>Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(''); }} className="link-btn">Sign in</button>
            </p>
          )}
        </div>
      </div>

      <div className="login-visual-sidebar">
        <div className="visual-content">
          <h3>Learn. Build. Discuss.</h3>
          <p>Your all-in-one AI platform for studying documents, multi-agent discussions, and architectural planning.</p>
          <div className="visual-stats">
            <div className="stat-item"><span>3</span> AI Modes</div>
            <div className="stat-item"><span>∞</span> Documents</div>
            <div className="stat-item"><span>7</span> Day Token</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
