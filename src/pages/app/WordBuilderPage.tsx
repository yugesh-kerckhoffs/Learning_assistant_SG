import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';

interface WordChallenge {
  word: string;
  hint: string;
  emoji: string;
}

const wordSets: WordChallenge[][] = [
  [
    { word: 'CAT', hint: 'A furry pet that says meow', emoji: '🐱' },
    { word: 'DOG', hint: 'A loyal pet that barks', emoji: '🐶' },
    { word: 'SUN', hint: 'It shines in the sky', emoji: '☀️' },
  ],
  [
    { word: 'FISH', hint: 'It swims in water', emoji: '🐟' },
    { word: 'BIRD', hint: 'It can fly in the sky', emoji: '🐦' },
    { word: 'STAR', hint: 'It twinkles at night', emoji: '⭐' },
  ],
  [
    { word: 'TREE', hint: 'It grows tall with leaves', emoji: '🌳' },
    { word: 'MOON', hint: 'You see it at night', emoji: '🌙' },
    { word: 'CAKE', hint: 'A sweet birthday treat', emoji: '🎂' },
  ],
  [
    { word: 'APPLE', hint: 'A red or green fruit', emoji: '🍎' },
    { word: 'HOUSE', hint: 'Where you live', emoji: '🏠' },
    { word: 'WATER', hint: 'You drink this', emoji: '💧' },
  ],
  [
    { word: 'HAPPY', hint: 'When you feel great!', emoji: '😊' },
    { word: 'OCEAN', hint: 'A huge body of water', emoji: '🌊' },
    { word: 'MUSIC', hint: 'Sounds that make you dance', emoji: '🎵' },
  ],
];

function shuffleLetters(word: string): string[] {
  const letters = word.split('');
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  if (letters.join('') === word && word.length > 1) {
    [letters[0], letters[1]] = [letters[1], letters[0]];
  }
  return letters;
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

const WordBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useApp();
  const [level, setLevel] = useState(1);
  const [wIdx, setWIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [placed, setPlaced] = useState<(string | null)[]>([]);
  const [available, setAvailable] = useState<{ letter: string; used: boolean }[]>([]);
  const [correct, setCorrect] = useState(false);
  const [showTrophy, setShowTrophy] = useState(false);

  const words = wordSets[Math.min(level - 1, wordSets.length - 1)];
  const current = words[wIdx];

  const initWord = useCallback(() => {
    const w = words[Math.min(wIdx, words.length - 1)];
    setPlaced(Array(w.word.length).fill(null));
    setAvailable(shuffleLetters(w.word).map(l => ({ letter: l, used: false })));
    setCorrect(false);
  }, [level, wIdx]);

  useEffect(() => { initWord(); }, [initWord]);

  const handleLetterClick = (idx: number) => {
    if (correct || available[idx].used) return;
    const firstEmpty = placed.indexOf(null);
    if (firstEmpty === -1) return;
    const newPlaced = [...placed];
    newPlaced[firstEmpty] = available[idx].letter;
    setPlaced(newPlaced);
    const newAvail = [...available];
    newAvail[idx].used = true;
    setAvailable(newAvail);

    if (newPlaced.every(p => p !== null)) {
      const word = newPlaced.join('');
      if (word === current.word) {
        setCorrect(true);
        setScore(s => s + 1);
        showNotification('🎉 Correct!');
        setTimeout(() => {
          if (wIdx < words.length - 1) {
            setWIdx(w => w + 1);
          } else if (level < 5) {
            showNotification(`🎉 Level ${level} Complete!`);
            setLevel(l => l + 1);
            setWIdx(0);
          } else {
            setShowTrophy(true);
            setTimeout(() => {
              setShowTrophy(false);
              navigate('/app/games');
            }, 4000);
          }
        }, 1200);
      } else {
        showNotification('❌ Not quite, try again!');
        setTimeout(() => initWord(), 800);
      }
    }
  };

  const handleSlotClick = (idx: number) => {
    if (correct || placed[idx] === null) return;
    const letter = placed[idx];
    const newPlaced = [...placed];
    newPlaced[idx] = null;
    setPlaced(newPlaced);
    const newAvail = [...available];
    const avIdx = newAvail.findIndex(a => a.letter === letter && a.used);
    if (avIdx !== -1) newAvail[avIdx].used = false;
    setAvailable(newAvail);
  };

  return (
    <div className="game-page-shell">
      {showTrophy && (
        <div style={trophyOverlayStyle}>
          {Array.from({ length: 30 }).map((_, i) => <div key={i} style={confettiStyle(i)} />)}
          <div style={trophyStyle}>🏆</div>
          <h2 style={{ color: '#FFD700', fontSize: '2em', marginTop: '20px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>🎉 Word Master! 🎉</h2>
          <p style={{ color: 'white', fontSize: '1.3em', marginTop: '10px' }}>You built all the words!</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1em', marginTop: '8px' }}>Score: {score}</p>
        </div>
      )}
      <div className="controls">
        <button className="control-btn exit-btn" onClick={() => navigate('/app/games')}>🚪 Exit</button>
        <button className="control-btn" onClick={initWord}>🔄 Shuffle</button>
      </div>
      <div className="game-page-inner" style={{ maxWidth: '500px', textAlign: 'center' }}>
        <h2 style={{ color: 'white', marginBottom: '4px' }}>🔤 Word Builder</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '8px 0 20px', color: 'rgba(255,255,255,0.7)', fontSize: '0.9em' }}>
          <span>Level {level}/5</span>
          <span>Score: {score}</span>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <div style={{ fontSize: '3em', marginBottom: '8px' }}>{current.emoji}</div>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px', fontStyle: 'italic' }}>
            💡 {current.hint}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {placed.map((letter, i) => (
              <div
                key={i}
                onClick={() => handleSlotClick(i)}
                style={{
                  width: '48px',
                  height: '56px',
                  borderRadius: '10px',
                  border: correct ? '3px solid #4CAF50' : (letter ? '3px solid rgba(255,255,255,0.4)' : '3px dashed rgba(255,255,255,0.2)'),
                  background: correct ? 'rgba(76,175,80,0.2)' : (letter ? 'rgba(255,255,255,0.1)' : 'transparent'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5em',
                  fontWeight: 'bold',
                  color: 'white',
                  cursor: letter ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}
              >
                {letter || ''}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {available.map((item, i) => (
              <button
                key={i}
                onClick={() => handleLetterClick(i)}
                disabled={item.used || correct}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  background: item.used ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, rgba(171,71,188,0.3), rgba(123,31,162,0.3))',
                  color: item.used ? 'rgba(255,255,255,0.2)' : 'white',
                  fontSize: '1.3em',
                  fontWeight: 'bold',
                  cursor: item.used ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {item.letter}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordBuilderPage;
