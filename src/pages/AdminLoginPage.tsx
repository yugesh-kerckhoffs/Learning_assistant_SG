import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  const [secretKey, setSecretKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!secretKey) { setError('❌ Please enter the admin secret key'); return; }
    setLoading(true);
    const result = await adminLogin(secretKey);
    setLoading(false);
    if (result.error) { setError(`❌ ${result.error}`); return; }
    navigate('/app');
  };

  return (
    <div className="auth-page" style={{ display: 'block' }}>
      <div className="auth-page-container">
        <div className="auth-page-left">
          <div className="auth-page-branding">
            <h1 className="auth-page-brand-title">Sendelightgifts   AiBuddy</h1>
            <p className="auth-page-brand-subtitle">Admin access portal</p>
          </div>
          <div className="auth-page-illustration admin-illustration">
            <div className="admin-icon">🔑</div>
            <p className="admin-text">Authorized Access Only</p>
          </div>
        </div>
        <div className="auth-page-right">
          <button className="auth-back-btn" onClick={() => navigate('/')}>← Back to Home</button>
          <div className="auth-form-container">
            <h2 className="auth-form-title">🔑 Admin Login</h2>
            <p className="auth-form-subtitle">Enter your admin secret key</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group-auth">
                <label className="form-label-auth">Admin Secret Key</label>
                <div className="password-input-container">
                  <input type={showKey ? 'text' : 'password'} className="form-input-auth" placeholder="Enter admin secret key" value={secretKey} onChange={e => setSecretKey(e.target.value)} required />
                  <button type="button" className="password-toggle" onClick={() => setShowKey(!showKey)}>{showKey ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <button type="submit" className="auth-submit-btn admin-btn-style" disabled={loading}>
                <span>{loading ? 'Verifying...' : 'Verify & Login'}</span>
              </button>
              {error && <p className="auth-error-message" style={{ display: 'block' }}>{error}</p>}
            </form>
            <div className="auth-info-box">
              <p>🎬 Admin access includes all features plus video generation capabilities.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
