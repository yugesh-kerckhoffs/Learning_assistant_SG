import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('❌ Please fill in all fields'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError('❌ Please enter a valid email address'); return; }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) { setError(`❌ ${result.error}`); return; }
    const redirectPath = localStorage.getItem('redirectAfterAuth');
    if (redirectPath) {
      localStorage.removeItem('redirectAfterAuth');
      navigate(redirectPath);
    } else {
      navigate('/app');
    }
  };

  return (
    <div className="auth-page" style={{ display: 'block' }}>
      <div className="auth-page-container">
        <div className="auth-page-left">
          <div className="auth-page-branding">
            <h1 className="auth-page-brand-title">Sendelightgifts   AiBuddy</h1>
            <p className="auth-page-brand-subtitle">Your friendly learning companion</p>
          </div>
          <div className="auth-page-illustration">
            <div className="auth-illustration-character leo">🐱</div>
            <div className="auth-illustration-character milo">🐭</div>
          </div>
        </div>
        <div className="auth-page-right">
          <button className="auth-back-btn" onClick={() => navigate('/')}>← Back to Home</button>
          <div className="auth-form-container">
            <h2 className="auth-form-title">🔐 Welcome Back!</h2>
            <p className="auth-form-subtitle">Sign in to continue your learning journey</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group-auth">
                <label className="form-label-auth">Email Address</label>
                <input type="email" className="form-input-auth" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group-auth">
                <label className="form-label-auth">Password</label>
                <div className="password-input-container">
                  <input type={showPassword ? 'text' : 'password'} className="form-input-auth" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div className="form-actions-row">
                <label className="checkbox-label">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                  <span>Remember me</span>
                </label>
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }} className="forgot-link">Forgot password?</a>
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              </button>
              {error && <p className="auth-error-message" style={{ display: 'block' }}>{error}</p>}
            </form>
            <div className="auth-divider"><span>Don't have an account?</span></div>
            <button className="auth-secondary-btn" onClick={() => navigate('/signup')}>Create New Account</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
