import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';

interface PatternQuestion {
  sequence: string[];
  options: string[];
  answer: string;
}

const generatePatterns = (level: number): PatternQuestion[] => {
  const allPatterns: PatternQuestion[][] = [
    [
      { sequence: ['🍎', '🍌', '🍎', '🍌', '🍎', '?'], options: ['🍎', '🍌', '🍇', '🍊'], answer: '🍌' },
      { sequence: ['⭐', '🌙', '⭐', '🌙', '⭐', '?'], options: ['⭐', '🌙', '☀️', '🌈'], answer: '🌙' },
      { sequence: ['🔴', '🔵', '🔴', '🔵', '?'], options: ['🔴', '🟢', '🔵', '🟡'], answer: '🔴' },
    ],
    [
      { sequence: ['🐱', '🐶', '🐰', '🐱', '🐶', '?'], options: ['🐱', '🐶', '🐰', '🐸'], answer: '🐰' },
      { sequence: ['🟡', '🟢', '🔵', '🟡', '🟢', '?'], options: ['🟡', '🔵', '🟢', '🔴'], answer: '🔵' },
      { sequence: ['1️⃣', '2️⃣', '3️⃣', '1️⃣', '2️⃣', '?'], options: ['1️⃣', '2️⃣', '3️⃣', '4️⃣'], answer: '3️⃣' },
    ],
    [
      { sequence: ['🌱', '🌿', '🌳', '🌱', '🌿', '?'], options: ['🌱', '🌿', '🌳', '🌸'], answer: '🌳' },
      { sequence: ['🐣', '🐥', '🐔', '🐣', '🐥', '?'], options: ['🐣', '🐥', '🐔', '🦅'], answer: '🐔' },
      { sequence: ['🌑', '🌓', '🌕', '🌑', '🌓', '?'], options: ['🌑', '🌓', '🌕', '⭐'], answer: '🌕' },
    ],
    [
      { sequence: ['😊', '😊', '😢', '😢', '😊', '?'], options: ['😊', '😢', '😠', '😴'], answer: '😊' },
      { sequence: ['🍎', '🍎', '🍊', '🍊', '🍎', '?'], options: ['🍎', '🍊', '🍇', '🍌'], answer: '🍎' },
      { sequence: ['🎵', '🎵', '🎶', '🎶', '🎵', '?'], options: ['🎵', '🎶', '🎸', '🎹'], answer: '🎵' },
    ],
    [
      { sequence: ['🔺', '🔺', '🔵', '🔺', '🔺', '🔵', '🔺', '🔺', '?'], options: ['🔺', '🔵', '🟢', '🟡'], answer: '🔵' },
      { sequence: ['🌸', '🌼', '🌸', '🌼', '🌸', '🌻', '🌸', '🌼', '?'], options: ['🌸', '🌼', '🌻', '🌹'], answer: '🌸' },
      { sequence: ['⬆️', '➡️', '⬇️', '⬅️', '⬆️', '➡️', '⬇️', '?'], options: ['⬆️', '➡️', '⬇️', '⬅️'], answer: '⬅️' },
    ],
  ];
  const idx = Math.min(level - 1, allPatterns.length - 1);
  return allPatterns[idx];
};

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

const PatternCompletionPage: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useApp();
  const [level, setLevel] = useState(1);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [showTrophy, setShowTrophy] = useState(false);

  const patterns = generatePatterns(level);
  const current = patterns[questionIdx];

  const handleSelect = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const isCorrect = opt === current.answer;
    setCorrect(isCorrect);
    if (isCorrect) {
      setScore(s => s + 1);
      showNotification('🎉 Correct!');
    } else {
      showNotification(`❌ The answer was ${current.answer}`);
    }
    setTimeout(() => {
      if (questionIdx < patterns.length - 1) {
        setQuestionIdx(q => q + 1);
      } else if (level < 5) {
        showNotification(`🎉 Level ${level} Complete!`);
        setLevel(l => l + 1);
        setQuestionIdx(0);
      } else {
        setShowTrophy(true);
        setTimeout(() => {
          setShowTrophy(false);
          navigate('/app/games');
        }, 4000);
      }
      setSelected(null);
      setCorrect(null);
    }, 1200);
  };

  return (
    <div className="game-page-shell">
      {showTrophy && (
        <div style={trophyOverlayStyle}>
          {Array.from({ length: 30 }).map((_, i) => <div key={i} style={confettiStyle(i)} />)}
          <div style={trophyStyle}>🏆</div>
          <h2 style={{ color: '#FFD700', fontSize: '2em', marginTop: '20px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>🎉 Amazing Job! 🎉</h2>
          <p style={{ color: 'white', fontSize: '1.3em', marginTop: '10px' }}>You completed all pattern levels!</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1em', marginTop: '8px' }}>Score: {score}</p>
        </div>
      )}
      <div className="controls">
        <button className="control-btn exit-btn" onClick={() => navigate('/app/games')}>🚪 Exit</button>
        <button className="control-btn" onClick={() => { setLevel(1); setQuestionIdx(0); setScore(0); }}>🔄 Restart</button>
      </div>
      <div className="game-page-inner" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <h2 style={{ color: 'white', marginBottom: '4px' }}>🧩 Pattern Completion</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '8px 0 20px', color: 'rgba(255,255,255,0.7)', fontSize: '0.9em' }}>
          <span>Level {level}/5</span>
          <span>Score: {score}</span>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '16px', fontSize: '0.9em' }}>
            What comes next in the pattern?
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '2em', marginBottom: '24px' }}>
            {current.sequence.map((item, i) => (
              <span key={i} style={{
                background: item === '?' ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '8px 12px',
                border: item === '?' ? '2px dashed #FFD700' : '2px solid transparent',
                minWidth: '50px',
                color: item === '?' ? '#FFD700' : 'white',
                fontWeight: item === '?' ? 'bold' : 'normal',
              }}>
                {item}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {current.options.map(opt => (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                disabled={!!selected}
                style={{
                  fontSize: '2em',
                  background: selected === opt
                    ? (correct ? 'rgba(76,175,80,0.4)' : 'rgba(244,67,54,0.4)')
                    : (selected && opt === current.answer ? 'rgba(76,175,80,0.4)' : 'rgba(255,255,255,0.1)'),
                  border: selected === opt
                    ? (correct ? '2px solid #4CAF50' : '2px solid #f44336')
                    : (selected && opt === current.answer ? '2px solid #4CAF50' : '2px solid rgba(255,255,255,0.15)'),
                  borderRadius: '12px',
                  padding: '12px 16px',
                  cursor: selected ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  minWidth: '60px',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternCompletionPage;
