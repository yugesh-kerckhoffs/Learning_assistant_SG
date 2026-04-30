import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const EmailConfirmationGate: React.FC = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="auth-modal" style={{ display: 'flex' }}>
      <div className="terms-content" style={{ maxWidth: '500px' }}>
        <div className="terms-header">
          <h2>📧 Confirm Your Email</h2>
          <p className="terms-subtitle">Almost there! One more step to get started</p>
        </div>
        <div className="terms-body" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '4em', marginBottom: '20px' }}>📬</div>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1em', marginBottom: '15px', lineHeight: '1.6' }}>
            We've sent a confirmation email to:
          </p>
          <p style={{
            color: '#4fc3f7',
            fontSize: '1.15em',
            fontWeight: 'bold',
            marginBottom: '20px',
            padding: '10px 20px',
            background: 'rgba(79, 195, 247, 0.1)',
            borderRadius: '10px',
            border: '1px solid rgba(79, 195, 247, 0.3)',
            wordBreak: 'break-all',
          }}>
            {currentUser?.email}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95em', marginBottom: '20px', lineHeight: '1.6' }}>
            Please check your inbox and click the confirmation link to activate your account.
            Once confirmed, you can sign in and start learning! 🌟
          </p>
          <div style={{
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
          }}>
            <p style={{ color: '#ffd54f', fontSize: '0.9em', margin: 0 }}>
              💡 Don't see the email? Check your spam/junk folder.
            </p>
          </div>
        </div>
        <div className="terms-actions" style={{ borderTop: 'none', justifyContent: 'center' }}>
          <button
            className="auth-btn"
            onClick={logout}
            style={{
              background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
              color: 'white',
              fontWeight: 'bold',
              padding: '12px 30px',
              borderRadius: '50px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1em',
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmationGate;
