import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Comic Sans MS", "Segoe UI", "Roboto", sans-serif',
      textAlign: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '30px',
        padding: '50px 40px',
        border: '2px solid rgba(79,195,247,0.3)',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: '5em', marginBottom: '10px', animation: 'bounce 2s infinite' }}>🐱</div>
        <h1 style={{
          fontSize: '4em',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #4fc3f7, #ab47bc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '10px',
        }}>404</h1>
        <h2 style={{ fontSize: '1.5em', color: '#4fc3f7', marginBottom: '15px' }}>
          Oops! This page got lost! 🗺️
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1em', marginBottom: '30px', lineHeight: '1.6' }}>
          Don't worry! Even Leo & Milo get lost sometimes. 🐭<br />
          Let's go back to a safe place!
        </p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'linear-gradient(135deg, #4fc3f7, #29b6f6)',
              color: 'white',
              border: 'none',
              padding: '14px 30px',
              borderRadius: '50px',
              fontSize: '1.1em',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(79,195,247,0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            🏠 Go Home
          </button>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
              padding: '14px 30px',
              borderRadius: '50px',
              fontSize: '1.1em',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'transform 0.2s, background 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            ← Go Back
          </button>
        </div>
      </div>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
};

export default NotFound;
