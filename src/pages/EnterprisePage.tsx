import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiContact } from '@/lib/api';

const EnterprisePage: React.FC = () => {
  const navigate = useNavigate();
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cMsg, setCMsg] = useState('');
  const [cLoading, setCLoading] = useState(false);
  const [cResult, setCResult] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim() || !cEmail.trim() || !cMsg.trim()) { setCResult('❌ Please fill in all fields'); return; }
    if (cName.trim().length > 100) { setCResult('❌ Name is too long'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cEmail.trim())) { setCResult('❌ Please enter a valid email'); return; }
    if (cMsg.trim().length > 2000) { setCResult('❌ Message is too long'); return; }
    setCLoading(true);
    try {
      await apiContact(cName, cEmail, cMsg);
      setCResult('✅ Message sent successfully!');
      setCName(''); setCEmail(''); setCMsg('');
    } catch { setCResult('❌ Failed to send message.'); }
    setCLoading(false);
  };

  return (
    <div className="auth-page" style={{ display: 'block' }}>
      <div className="auth-page-container">
        <div className="auth-page-left">
          <div className="auth-page-branding">
            <h1 className="auth-page-brand-title">Sendelightgifts   AiBuddy</h1>
            <p className="auth-page-brand-subtitle">Enterprise Solutions</p>
          </div>
        </div>
        <div className="auth-page-right">
          <div className="auth-card" style={{ padding: '30px' }}>
            <div className="auth-card-header" style={{ marginBottom: '25px' }}>
              <h2 className="auth-card-title" style={{ marginBottom: '10px' }}>🏢 Enterprise Contact</h2>
              <p className="auth-card-subtitle">Tell us about your organization and how we can help</p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group-auth">
                <label className="form-label-auth">Your Name</label>
                <input type="text" className="form-input-auth" placeholder="Enter your name" value={cName} onChange={e => setCName(e.target.value)} required />
              </div>
              <div className="form-group-auth">
                <label className="form-label-auth">Email Address</label>
                <input type="email" className="form-input-auth" placeholder="your@email.com" value={cEmail} onChange={e => setCEmail(e.target.value)} required />
              </div>
              <div className="form-group-auth">
                <label className="form-label-auth">Message</label>
                <textarea className="form-input-auth" placeholder="Tell us about your enterprise needs..." rows={4} value={cMsg} onChange={e => setCMsg(e.target.value)} required style={{ resize: 'vertical', minHeight: '100px' }} />
              </div>
              <button type="submit" className="auth-submit-btn" disabled={cLoading} style={{ width: '100%', marginBottom: '10px' }}>
                <span>{cLoading ? 'Sending... ⏳' : 'Send Message 📤'}</span>
              </button>
              {cResult && <p className={cResult.includes('✅') ? 'auth-success-message' : 'auth-error-message'} style={{ display: 'block' }}>{cResult}</p>}
            </form>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={() => navigate('/')}
                className="auth-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95em' }}
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterprisePage;
