import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { externalSupabase } from '@/lib/externalSupabase';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
    const type = hashParams.get('type') || searchParams.get('type');

    if (type === 'recovery' && accessToken) {
      externalSupabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      }).then(({ error }) => {
        if (error) {
          console.error('Session error:', error);
          setError('❌ This reset link is invalid or has expired. Please request a new one.');
        } else {
          setSessionReady(true);
        }
      });
      return;
    }

    const { data: { subscription } } = externalSupabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    externalSupabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!password || !confirmPassword) { setError('❌ Please fill in both fields'); return; }
    if (password.length < 6) { setError('❌ Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('❌ Passwords do not match'); return; }
    
    setLoading(true);
    const { error: updateError } = await externalSupabase.auth.updateUser({ password });
    setLoading(false);
    
    if (updateError) { setError(`❌ ${updateError.message}`); return; }
    setSuccess('✅ Password updated successfully! Redirecting to sign in...');
    await externalSupabase.auth.signOut();
    setTimeout(() => navigate('/signin'), 2000);
  };

  return (
    <div className="auth-page" style={{ display: 'block' }}>
      <div className="auth-page-container">
        <div className="auth-page-left">
          <div className="auth-page-branding">
            <h1 className="auth-page-brand-title">Sendelightgifts   AiBuddy</h1>
            <p className="auth-page-brand-subtitle">Set your new password</p>
          </div>
          <div className="auth-page-illustration">
            <div className="auth-illustration-character" style={{ fontSize: '8em' }}>🔐</div>
          </div>
        </div>
        <div className="auth-page-right">
          <div className="auth-form-container">
            <h2 className="auth-form-title">🔑 New Password</h2>
            <p className="auth-form-subtitle">
              {sessionReady ? 'Enter your new password below' : 'Verifying your reset link...'}
            </p>
            {sessionReady ? (
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group-auth">
                  <label className="form-label-auth">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} className="form-input-auth" placeholder="Enter new password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={{ paddingRight: '45px' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3em', padding: '2px' }} title={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div className="form-group-auth">
                  <label className="form-label-auth">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showConfirmPassword ? 'text' : 'password'} className="form-input-auth" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} style={{ paddingRight: '45px' }} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3em', padding: '2px' }} title={showConfirmPassword ? 'Hide password' : 'Show password'}>
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  <span>{loading ? 'Updating...' : 'Update Password'}</span>
                </button>
                {error && <p className="auth-error-message" style={{ display: 'block' }}>{error}</p>}
                {success && <p className="auth-success-message" style={{ display: 'block' }}>{success}</p>}
              </form>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                {error ? (
                  <>
                    <p style={{ color: '#ff6b6b', marginBottom: '15px' }}>{error}</p>
                    <button className="auth-submit-btn" onClick={() => navigate('/forgot-password')}>
                      <span>Request New Reset Link</span>
                    </button>
                  </>
                ) : (
                  <p style={{ color: '#aaa' }}>⏳ Please wait while we verify your reset link...</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
