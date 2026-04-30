import React, { useEffect, useState } from 'react';

const MaintenancePage: React.FC = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Comic Sans MS", "Segoe UI", "Roboto", sans-serif',
      color: '#ffffff',
      padding: '20px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-10%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(118,75,162,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 10s ease-in-out infinite reverse',
      }} />

      <div style={{
        textAlign: 'center',
        maxWidth: '600px',
        zIndex: 1,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '24px',
        padding: '50px 40px',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Animated gear icon */}
        <div style={{
          fontSize: '4rem',
          marginBottom: '20px',
          animation: 'spin 4s linear infinite',
          display: 'inline-block',
        }}>
          ⚙️
        </div>

        <h1 style={{
          fontSize: '2.2rem',
          fontWeight: 'bold',
          marginBottom: '12px',
          background: 'linear-gradient(135deg, #4fc3f7, #ab47bc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          We'll Be Right Back!
        </h1>

        <p style={{
          fontSize: '1.15rem',
          color: 'rgba(255,255,255,0.8)',
          marginBottom: '30px',
          lineHeight: 1.6,
        }}>
           AiBuddy is getting some awesome updates to make your experience even better! 🚀
        </p>

        {/* Progress bar animation */}
        <div style={{
          width: '100%',
          height: '6px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: '24px',
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #4fc3f7, #ab47bc, #4fc3f7)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s linear infinite',
            borderRadius: '3px',
          }} />
        </div>

        <p style={{
          fontSize: '1rem',
          color: 'rgba(255,255,255,0.6)',
        }}>
          Working on improvements{dots}
        </p>

        <div style={{
          marginTop: '30px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <a
            href="https://sendelightgifts.com/donations/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 24px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '0.95rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
          >
            💛 Support Us
          </a>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MaintenancePage;
