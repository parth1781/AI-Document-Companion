import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, ArrowRight, Mail, KeyRound, Lock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Login = () => {
  // mode: 'login' | 'register' | 'forgot-email' | 'forgot-otp'
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const resetState = () => {
    setError(''); setSuccess(''); setOtp(''); setNewPassword(''); setPassword('');
  };

  // Step 1: Send OTP to email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`OTP sent to ${email}. Check your inbox (or server terminal if using test SMTP).`);
      setMode('forgot-otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Password reset! You can now log in.');
      setMode('login');
      resetState();
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Standard login / register
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/study');
      } else {
        await register(name, email, password);
        navigate('/study');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const isForgot = mode === 'forgot-email' || mode === 'forgot-otp';

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <Compass size={28} color="var(--primary)" />
          </div>
          <h2>
            {mode === 'login' && 'Welcome back'}
            {mode === 'register' && 'Create an account'}
            {mode === 'forgot-email' && 'Forgot Password'}
            {mode === 'forgot-otp' && 'Enter OTP'}
          </h2>
          <p>
            {mode === 'login' && 'Sign in to your Learning Hub.'}
            {mode === 'register' && 'Join thousands of learners today.'}
            {mode === 'forgot-email' && 'We\'ll send a one-time code to your email.'}
            {mode === 'forgot-otp' && `Enter the 6-digit code we sent to ${email}.`}
          </p>
        </div>

        {/* --- Forgot email step --- */}
        {mode === 'forgot-email' && (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="input-group">
              <label htmlFor="reset-email"><Mail size={14} style={{marginRight:4}}/> Email Address</label>
              <input type="email" id="reset-email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="name@example.com"
                required className="login-input" />
            </div>
            {error && <div className="auth-error">{error}</div>}
            {success && <div style={{padding:'0.75rem',background:'#dcfce7',borderRadius:'6px',color:'#166534',fontSize:'0.9rem'}}>{success}</div>}
            <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
              {isLoading ? 'Sending OTP...' : 'Send OTP'} {!isLoading && <ArrowRight size={16} style={{marginLeft:'8px'}} />}
            </button>
          </form>
        )}

        {/* --- OTP + new password step --- */}
        {mode === 'forgot-otp' && (
          <form onSubmit={handleResetPassword} className="login-form">
            {success && <div style={{padding:'0.75rem',background:'#dcfce7',borderRadius:'6px',color:'#166534',fontSize:'0.9rem',marginBottom:'0.5rem'}}>{success}</div>}
            <div className="input-group">
              <label htmlFor="otp-input"><KeyRound size={14} style={{marginRight:4}}/> 6-Digit OTP</label>
              <input type="text" id="otp-input" value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/,'').slice(0,6))}
                placeholder="e.g. 483921" maxLength={6} required className="login-input"
                style={{letterSpacing:'8px', fontSize:'1.4rem', fontWeight:700, textAlign:'center'}} />
            </div>
            <div className="input-group">
              <label htmlFor="new-pass"><Lock size={14} style={{marginRight:4}}/> New Password</label>
              <input type="password" id="new-pass" value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters" required className="login-input" />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
              {isLoading ? 'Resetting...' : 'Reset Password'} {!isLoading && <ArrowRight size={16} style={{marginLeft:'8px'}} />}
            </button>
            <button type="button" onClick={() => { resetState(); setMode('forgot-email'); }}
              className="link-btn" style={{marginTop:'0.5rem', display:'block', textAlign:'center', width:'100%'}}>
              ← Resend / change email
            </button>
          </form>
        )}

        {/* --- Login / Register --- */}
        {!isForgot && (
          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'register' && (
              <div className="input-group">
                <label htmlFor="name">Full Name</label>
                <input type="text" id="name" value={name}
                  onChange={e => setName(e.target.value)} placeholder="e.g. Ram Charan"
                  required className="login-input" />
              </div>
            )}
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="name@example.com"
                required className="login-input" />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input type="password" id="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                required className="login-input" />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
              {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              {!isLoading && <ArrowRight size={16} style={{marginLeft:'8px'}} />}
            </button>
          </form>
        )}

        <div className="login-footer">
          {mode === 'login' && (
            <>
              <p>Don't have an account?{' '}
                <button onClick={() => { setMode('register'); resetState(); }} className="link-btn">Sign up free</button>
              </p>
              <p style={{marginTop:'0.5rem'}}>
                <button onClick={() => { setMode('forgot-email'); resetState(); }} className="link-btn" style={{fontSize:'0.85rem'}}>
                  Forgot Password?
                </button>
              </p>
            </>
          )}
          {mode === 'register' && (
            <p>Already have an account?{' '}
              <button onClick={() => { setMode('login'); resetState(); }} className="link-btn">Sign in</button>
            </p>
          )}
          {isForgot && (
            <p>
              <button onClick={() => { setMode('login'); resetState(); }} className="link-btn">← Back to Sign In</button>
            </p>
          )}
        </div>
      </div>

      <div className="login-visual-sidebar">
        <div className="visual-content">
          <h3>Learning Hub</h3>
          <p>Your all-in-one AI platform for studying documents, multi-agent discussions, and architectural planning.</p>
          <div className="visual-stats">
            <div className="stat-item"><span>3</span> AI Modes</div>
            <div className="stat-item"><span>∞</span> Documents</div>
            <div className="stat-item"><span>OTP</span> Secured</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
