import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { externalSupabase } from '@/lib/externalSupabase';
import { apiCheckEmailExists } from '@/lib/api';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) { setError('❌ Please enter your email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('❌ Please enter a valid email address'); return; }

    setLoading(true);

    try {
      // Step 1: Securely check if email exists via backend
      const result = await apiCheckEmailExists(email);

      if (result.error) {
        // Server error — don't reveal details, show generic message
        setLoading(false);
        setError('❌ Something went wrong. Please try again later.');
        return;
      }

      if (!result.exists) {
        setLoading(false);
        setError('❌ This email is not registered. Please check the email or sign up.');
        return;
      }

      // Step 2: Email exists — send reset link
      const { error: resetError } = await externalSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      setLoading(false);

      if (resetError) {
        setError(`❌ ${resetError.message}`);
        return;
      }

      setSuccess('✅ A password reset link has been sent to your email. Check your inbox!');
    } catch {
      setLoading(false);
      setError('❌ Something went wrong. Please try again later.');
    }
  };

  return (
    <div className="auth-page" style={{ display: 'block' }}>
      <div className="auth-page-container">
        <div className="auth-page-left">
          <div className="auth-page-branding">
            <h1 className="auth-page-brand-title">Sendelightgifts   AiBuddy</h1>
            <p className="auth-page-brand-subtitle">Reset your password</p>
          </div>
          <div className="auth-page-illustration">
            <div className="auth-illustration-character" style={{ fontSize: '8em' }}>🔐</div>
          </div>
        </div>
        <div className="auth-page-right">
          <button className="auth-back-btn" onClick={() => navigate('/signin')}>← Back to Sign In</button>
          <div className="auth-form-container">
            <h2 className="auth-form-title">🔑 Reset Password</h2>
            <p className="auth-form-subtitle">Enter your email to receive a reset link</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group-auth">
                <label className="form-label-auth">Email Address</label>
                <input type="email" className="form-input-auth" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                <span>{loading ? 'Verifying...' : 'Send Reset Link'}</span>
              </button>
              {error && <p className="auth-error-message" style={{ display: 'block' }}>{error}</p>}
              {success && <p className="auth-success-message" style={{ display: 'block' }}>{success}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
