import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { colorsData } from '@/data/gameData';
import { externalSupabase } from '@/lib/externalSupabase';

const trophyOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
  background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column',
  justifyContent: 'center', alignItems: 'center', zIndex: 10002,
  animation: 'popIn 0.5s ease-out',
};
const trophyStyle: React.CSSProperties = {
  fontSize: '8em', animation: 'trophyBounce 1s ease-in-out infinite',
  filter: 'drop-shadow(0 10px 40px rgba(255, 193, 7, 0.6))',
};
const confettiStyle = (i: number): React.CSSProperties => ({
  position: 'absolute', width: '10px', height: '10px',
  borderRadius: i % 2 === 0 ? '50%' : '2px',
  background: ['#FFD700', '#FF6B6B', '#4FC3F7', '#66BB6A', '#AB47BC', '#FFA726'][i % 6],
  top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
  animation: `confettiFall ${1.5 + Math.random() * 2}s ease-in-out infinite`,
  animationDelay: `${Math.random() * 2}s`, opacity: 0.8,
});

const ColorsGamePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showNotification } = useApp();
  const [level, setLevel] = useState(1);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedItems, setMatchedItems] = useState<string[]>([]);
  const [currentItems, setCurrentItems] = useState<any[]>([]);
  const [rightItems, setRightItems] = useState<any[]>([]);
  const [showTrophy, setShowTrophy] = useState(false);

  const initLevel = useCallback((lv: number) => {
    const data = colorsData[Math.min(lv, 10)];
    if (!data) return;
    setCurrentItems([...data]);
    setRightItems([...data].sort(() => Math.random() - 0.5));
    setMatchedItems([]); setSelectedLeft(null); setSelectedRight(null);
  }, []);

  useEffect(() => { initLevel(level); }, [level, initLevel]);

  const selectLeft = (name: string) => { if (matchedItems.includes(name)) return; setSelectedLeft(name); if (selectedRight) checkMatch(name, selectedRight); };
  const selectRight = (name: string) => { if (matchedItems.includes(name)) return; setSelectedRight(name); if (selectedLeft) checkMatch(selectedLeft, name); };

  const checkMatch = (left: string, right: string) => {
    if (left === right) {
      const newMatched = [...matchedItems, left];
      setMatchedItems(newMatched); setSelectedLeft(null); setSelectedRight(null);
      showNotification('🎉 Great match!');
      if (newMatched.length === currentItems.length) setTimeout(() => levelComplete(), 1000);
    } else {
      showNotification('❌ Try again!');
      setTimeout(() => { setSelectedLeft(null); setSelectedRight(null); }, 1000);
    }
  };

  const saveToDb = async (lv: number, completed: boolean) => {
    if (!currentUser?.id) return;
    try { await externalSupabase.from('colors_shapes_sessions').insert({ user_id: currentUser.id, game_type: 'colors', level_reached: lv, completed }); } catch {}
  };

  const levelComplete = () => {
    if (level < 10) {
      showNotification(`🎉 Level ${level} Complete!`);
      saveToDb(level, false);
      setLevel(l => l + 1);
    } else {
      setShowTrophy(true);
      showNotification('🏆 You completed all levels!');
      saveToDb(10, true);
      setTimeout(() => { setShowTrophy(false); navigate('/app/games'); setLevel(1); }, 4000);
    }
  };

  return (
    <>
      {showTrophy && (
        <div style={trophyOverlayStyle}>
          {Array.from({ length: 30 }).map((_, i) => <div key={i} style={confettiStyle(i)} />)}
          <div style={trophyStyle}>🏆</div>
          <h2 style={{ color: '#FFD700', fontSize: '2em', marginTop: '20px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>🎉 Congratulations! 🎉</h2>
          <p style={{ color: 'white', fontSize: '1.3em', marginTop: '10px' }}>You completed all 10 levels of Colors!</p>
        </div>
      )}
      <div className="controls">
        <button className="control-btn exit-btn" onClick={() => navigate('/app/games')}>🚪 Back</button>
        <button className="control-btn" onClick={() => initLevel(level)}>🔄 Restart Level</button>
      </div>
      <div className="colors-shapes-game-container">
        <h2 className="colors-shapes-game-title">🎨 Colors Matching - Level {level}</h2>
        <p className="colors-shapes-instructions">Click one item on the left, then click its match on the right!</p>
        <div className="matching-game-grid">
          <div className="matching-column left-column">
            {currentItems.map((item, i) => (
              <div key={`left-${i}`} className={`matching-item ${selectedLeft === item.name ? 'selected' : ''} ${matchedItems.includes(item.name) ? 'matched' : ''}`} onClick={() => selectLeft(item.name)}>
                <div className="color-box" style={{ background: item.color, ...(item.name === 'White' ? { border: '3px solid #666' } : {}) }} />
              </div>
            ))}
          </div>
          <div className="matching-column right-column">
            {rightItems.map((item, i) => (
              <div key={`right-${i}`} className={`matching-item ${selectedRight === item.name ? 'selected' : ''} ${matchedItems.includes(item.name) ? 'matched' : ''}`} onClick={() => selectRight(item.name)}>
                <div className="name-box">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ColorsGamePage;
