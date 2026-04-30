import React, { useState } from 'react';

interface CharacterSelectionModalProps {
  onSelect: (character: 'leo' | 'milo') => Promise<{ error?: string } | void>;
}

const CharacterSelectionModal: React.FC<CharacterSelectionModalProps> = ({ onSelect }) => {
  const [selected, setSelected] = useState<'leo' | 'milo' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = (char: 'leo' | 'milo') => {
    setSelected(char);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    await onSelect(selected);
    setLoading(false);
  };

  return (
    <div className="auth-modal" style={{ display: 'flex' }}>
      <div className="terms-content" style={{ maxWidth: '550px' }}>
        <div className="terms-header">
          <h2>🎭 Choose Your Buddy!</h2>
          <p className="terms-subtitle">Pick a character who'll chat with you throughout the app</p>
        </div>
        <div className="terms-body" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* Leo */}
            <button
              onClick={() => handleSelect('leo')}
              style={{
                flex: '1 1 180px',
                maxWidth: '220px',
                padding: '20px',
                borderRadius: '16px',
                border: selected === 'leo' ? '3px solid #4fc3f7' : '2px solid rgba(255,255,255,0.15)',
                background: selected === 'leo' ? 'rgba(79,195,247,0.15)' : 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textAlign: 'center' as const,
                transform: selected === 'leo' ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🐱</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Leo</div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>
                Smart, wise & helpful. A gentle mentor who explains things clearly and encourages you every step of the way! 🌟
              </p>
            </button>
            {/* Milo */}
            <button
              onClick={() => handleSelect('milo')}
              style={{
                flex: '1 1 180px',
                maxWidth: '220px',
                padding: '20px',
                borderRadius: '16px',
                border: selected === 'milo' ? '3px solid #66bb6a' : '2px solid rgba(255,255,255,0.15)',
                background: selected === 'milo' ? 'rgba(102,187,106,0.15)' : 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textAlign: 'center' as const,
                transform: selected === 'milo' ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🐭</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Milo</div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>
                Fun, playful & energetic! A curious friend who makes learning feel like an exciting adventure! 🎉
              </p>
            </button>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textAlign: 'center', marginTop: '15px' }}>
            💡 You can change your character anytime on the Account page.
          </p>
        </div>
        <div className="terms-actions" style={{ borderTop: 'none', justifyContent: 'center' }}>
          <button
            disabled={!selected || loading}
            onClick={handleConfirm}
            style={{
              background: !selected ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #4fc3f7, #29b6f6)',
              color: '#fff',
              fontWeight: 'bold',
              padding: '12px 30px',
              borderRadius: '50px',
              border: 'none',
              cursor: !selected ? 'not-allowed' : 'pointer',
              fontSize: '1em',
              opacity: !selected ? 0.5 : 1,
            }}
          >
            {loading ? '⏳ Saving...' : selected ? `Let's go with ${selected === 'leo' ? 'Leo 🐱' : 'Milo 🐭'}!` : 'Select a character'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterSelectionModal;
