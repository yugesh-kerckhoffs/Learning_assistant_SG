import React, { useState, useCallback, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { memoryGameEmojis, gridConfigs } from '@/data/gameData';
import { externalSupabase } from '@/lib/externalSupabase';

interface MemoryCard {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

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

const MemoryGamePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showNotification } = useApp();
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [memoryLevel, setMemoryLevel] = useState(1);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryComplete, setMemoryComplete] = useState(false);
  const [showTrophy, setShowTrophy] = useState(false);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [canFlip, setCanFlip] = useState(true);

  const saveToDb = async (level: number, moves: number, completed: boolean) => {
    if (!currentUser?.id) return;
    try {
      await externalSupabase.from('memory_game_sessions').insert({
        user_id: currentUser.id, level_reached: level, moves_used: moves, completed,
      });
    } catch (e) { console.error('Save error:', e); }
  };

  const initMemoryGame = useCallback((level: number) => {
    const levelIdx = Math.min(level, 6) - 1;
    const emojis = memoryGameEmojis[level] || memoryGameEmojis[1];
    const config = gridConfigs[levelIdx] || gridConfigs[0];
    const pairCount = (config.rows * config.cols) / 2;
    const selectedEmojis = emojis.slice(0, pairCount);
    const pairs = [...selectedEmojis, ...selectedEmojis];
    const shuffled = pairs.sort(() => Math.random() - 0.5);
    setMemoryCards(shuffled.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false })));
    setMemoryComplete(false);
    setShowTrophy(false);
    setFlippedCards([]);
    setCanFlip(true);
  }, []);

  useLayoutEffect(() => {
    initMemoryGame(memoryLevel);
  }, [memoryLevel, initMemoryGame]);

  const handleMemoryClick = (id: number) => {
    if (!canFlip || flippedCards.length >= 2) return;
    const card = memoryCards[id];
    if (card.flipped || card.matched) return;

    const newCards = [...memoryCards];
    newCards[id].flipped = true;
    setMemoryCards(newCards);
    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setCanFlip(false);
      setMemoryMoves(m => m + 1);
      const [first, second] = newFlipped;
      if (newCards[first].emoji === newCards[second].emoji) {
        newCards[first].matched = true;
        newCards[second].matched = true;
        setMemoryCards([...newCards]);
        setFlippedCards([]);
        setCanFlip(true);
        
        if (newCards.every(c => c.matched)) {
          if (memoryLevel < 6) {
            showNotification(`🎉 Level ${memoryLevel} Complete! Moving to Level ${memoryLevel + 1}!`);
            saveToDb(memoryLevel, memoryMoves + 1, false);
            setTimeout(() => setMemoryLevel(l => l + 1), 1500);
          } else {
            setShowTrophy(true);
            setMemoryComplete(true);
            showNotification('🏆 Congratulations! You completed all levels!');
            saveToDb(6, memoryMoves + 1, true);
            setTimeout(() => {
              setShowTrophy(false);
              navigate('/app/games');
            }, 4000);
          }
        }
      } else {
        setTimeout(() => {
          newCards[first].flipped = false;
          newCards[second].flipped = false;
          setMemoryCards([...newCards]);
          setFlippedCards([]);
          setCanFlip(true);
        }, 800);
      }
    }
  };

  const getMemoryGridStyle = () => {
    const levelIdx = Math.min(memoryLevel, 6) - 1;
    const config = gridConfigs[levelIdx] || gridConfigs[0];
    return { gridTemplateColumns: `repeat(${config.cols}, var(--memory-card-size))` };
  };

  return (
    <>
      {showTrophy && (
        <div style={trophyOverlayStyle}>
          {Array.from({ length: 30 }).map((_, i) => <div key={i} style={confettiStyle(i)} />)}
          <div style={trophyStyle}>🏆</div>
          <h2 style={{ color: '#FFD700', fontSize: '2em', marginTop: '20px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>🎉 Congratulations! 🎉</h2>
          <p style={{ color: 'white', fontSize: '1.3em', marginTop: '10px' }}>You completed all 6 levels of Memory!</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1em', marginTop: '8px' }}>Total Moves: {memoryMoves}</p>
        </div>
      )}
      <div className="controls">
        <button className="control-btn exit-btn" onClick={() => navigate('/app/games')}>🚪 Exit</button>
        <button className="control-btn" onClick={() => { setMemoryLevel(1); setMemoryMoves(0); initMemoryGame(1); }}>🔄 Restart</button>
      </div>
      <div className="memory-game-container">
        <h2 className="memory-game-title">🎮 Memory Matching Game</h2>
        <div className="memory-game-info">
          <div className="memory-level">Level: <span>{memoryLevel}</span></div>
          <div className="memory-moves">Moves: <span>{memoryMoves}</span></div>
        </div>
        <div key={memoryLevel} className="memory-grid" style={getMemoryGridStyle()}>
          {memoryCards.map(card => (
            <div key={`${memoryLevel}-${card.id}`} className={`memory-card ${card.flipped ? 'flipped' : ''} ${card.matched ? 'matched' : ''}`} onClick={() => handleMemoryClick(card.id)}>
              <div className="memory-card-inner">
                <div className="memory-card-front">?</div>
                <div className="memory-card-back">{card.emoji}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default MemoryGamePage;
