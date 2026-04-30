import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { colorsData, shapesData } from '@/data/gameData';
import { externalSupabase } from '@/lib/externalSupabase';

// Trophy confetti styles
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
  position: 'absolute',
  width: '10px', height: '10px',
  borderRadius: i % 2 === 0 ? '50%' : '2px',
  background: ['#FFD700', '#FF6B6B', '#4FC3F7', '#66BB6A', '#AB47BC', '#FFA726'][i % 6],
  top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
  animation: `confettiFall ${1.5 + Math.random() * 2}s ease-in-out infinite`,
  animationDelay: `${Math.random() * 2}s`,
  opacity: 0.8,
});

const ColorsShapesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showNotification } = useApp();
  const [csSubMode, setCsSubMode] = useState<'menu' | 'colors' | 'shapes'>('menu');
  const [csLevel, setCsLevel] = useState(1);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedItems, setMatchedItems] = useState<string[]>([]);
  const [currentItems, setCurrentItems] = useState<any[]>([]);
  const [rightItems, setRightItems] = useState<any[]>([]);
  const [showTrophy, setShowTrophy] = useState(false);

  const initLevel = useCallback((type: 'colors' | 'shapes', level: number) => {
    const data = type === 'colors' ? colorsData[Math.min(level, 10)] : shapesData[Math.min(level, 10)];
    if (!data) return;
    setCurrentItems([...data]);
    setRightItems([...data].sort(() => Math.random() - 0.5));
    setMatchedItems([]);
    setSelectedLeft(null);
    setSelectedRight(null);
  }, []);

  useEffect(() => {
    if (csSubMode === 'colors' || csSubMode === 'shapes') {
      initLevel(csSubMode, csLevel);
    }
  }, [csSubMode, csLevel, initLevel]);

  const selectLeft = (name: string) => {
    if (matchedItems.includes(name)) return;
    setSelectedLeft(name);
    if (selectedRight) checkMatch(name, selectedRight);
  };

  const selectRight = (name: string) => {
    if (matchedItems.includes(name)) return;
    setSelectedRight(name);
    if (selectedLeft) checkMatch(selectedLeft, name);
  };

  const checkMatch = (left: string, right: string) => {
    if (left === right) {
      const newMatched = [...matchedItems, left];
      setMatchedItems(newMatched);
      setSelectedLeft(null);
      setSelectedRight(null);
      showNotification('🎉 Great match!');
      if (newMatched.length === currentItems.length) {
        setTimeout(() => levelComplete(), 1000);
      }
    } else {
      showNotification('❌ Try again!');
      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 1000);
    }
  };

  const saveToDb = async (gameType: string, level: number, completed: boolean) => {
    if (!currentUser?.id) return;
    try {
      await externalSupabase.from('colors_shapes_sessions').insert({
        user_id: currentUser.id, game_type: gameType, level_reached: level, completed,
      });
    } catch (e) { console.error('Save error:', e); }
  };

  const levelComplete = () => {
    if (csLevel < 10) {
      showNotification(`🎉 Level ${csLevel} Complete! Moving to Level ${csLevel + 1}!`);
      saveToDb(csSubMode, csLevel, false);
      setCsLevel(l => l + 1);
    } else {
      // Show trophy animation for completing all levels
      setShowTrophy(true);
      showNotification('🏆 You completed all levels!');
      saveToDb(csSubMode, 10, true);
      setTimeout(() => {
        setShowTrophy(false);
        setCsSubMode('menu');
        setCsLevel(1);
      }, 4000);
    }
  };

  if (csSubMode === 'menu') {
    return (
      <div className="colors-shapes-menu">
        <h2 className="colors-shapes-title">🎨 Colors & Shapes Learning</h2>
        <p className="colors-shapes-subtitle">Choose what you want to learn today!</p>
        <div className="game-type-buttons">
          <button className="game-type-btn" style={{ background: 'linear-gradient(135deg, #ff6b6b, #ffa726)' }} onClick={() => setCsSubMode('colors')}>
            <div className="game-type-icon">🎨</div>
            <div className="game-type-name">Colors</div>
            <div className="game-type-desc">Match colors with their names</div>
          </button>
          <button className="game-type-btn" style={{ background: 'linear-gradient(135deg, #4fc3f7, #29b6f6)' }} onClick={() => setCsSubMode('shapes')}>
            <div className="game-type-icon">⬛</div>
            <div className="game-type-name">Shapes</div>
            <div className="game-type-desc">Match shapes with their names</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Trophy celebration overlay */}
      {showTrophy && (
        <div style={trophyOverlayStyle}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} style={confettiStyle(i)} />
          ))}
          <div style={trophyStyle}>🏆</div>
          <h2 style={{ color: '#FFD700', fontSize: '2em', marginTop: '20px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            🎉 Congratulations! 🎉
          </h2>
          <p style={{ color: 'white', fontSize: '1.3em', marginTop: '10px' }}>
            You completed all 10 levels of {csSubMode === 'colors' ? 'Colors' : 'Shapes'}!
          </p>
        </div>
      )}

      <div className="controls">
        <button className="control-btn exit-btn" onClick={() => { setCsSubMode('menu'); setCsLevel(1); }}>🚪 Exit</button>
        <button className="control-btn" onClick={() => initLevel(csSubMode, csLevel)}>🔄 Restart Level</button>
      </div>
      <div className="colors-shapes-game-container">
        <h2 className="colors-shapes-game-title">{csSubMode === 'colors' ? '🎨 Colors' : '⬛ Shapes'} Matching - Level {csLevel}</h2>
        <p className="colors-shapes-instructions">Click one item on the left, then click its match on the right!</p>
        <div className="matching-game-grid">
          <div className="matching-column left-column">
            {currentItems.map((item, i) => (
              <div
                key={`left-${i}`}
                className={`matching-item ${selectedLeft === item.name ? 'selected' : ''} ${matchedItems.includes(item.name) ? 'matched' : ''}`}
                onClick={() => selectLeft(item.name)}
              >
                {csSubMode === 'colors' ? (
                  <div className="color-box" style={{ background: item.color, ...(item.name === 'White' ? { border: '3px solid #666' } : {}) }} />
                ) : (
                  <div className="shape-box" style={{ color: item.color }}>{item.shape}</div>
                )}
              </div>
            ))}
          </div>
          <div className="matching-column right-column">
            {rightItems.map((item, i) => (
              <div
                key={`right-${i}`}
                className={`matching-item ${selectedRight === item.name ? 'selected' : ''} ${matchedItems.includes(item.name) ? 'matched' : ''}`}
                onClick={() => selectRight(item.name)}
              >
                <div className="name-box">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ColorsShapesPage;
