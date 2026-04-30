import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';

interface OddQuestion {
  items: string[];
  oddIndex: number;
  explanation: string;
}

const allQuestions: OddQuestion[][] = [
  [
    { items: ['🐱', '🐶', '🍎', '🐰'], oddIndex: 2, explanation: '🍎 is a fruit, the rest are animals!' },
    { items: ['🍌', '🍇', '🚗', '🍊'], oddIndex: 2, explanation: '🚗 is a vehicle, the rest are fruits!' },
    { items: ['⚽', '🏀', '🎾', '🌸'], oddIndex: 3, explanation: '🌸 is a flower, the rest are sports balls!' },
  ],
  [
    { items: ['🐦', '🦅', '🦇', '🐧'], oddIndex: 2, explanation: '🦇 is a mammal, the rest are birds!' },
    { items: ['🍕', '🍔', '🌮', '📚'], oddIndex: 3, explanation: '📚 is a book, the rest are food!' },
    { items: ['🔴', '🟢', '🔵', '⬛'], oddIndex: 3, explanation: '⬛ is a shape, the others are colored circles!' },
  ],
  [
    { items: ['🚗', '🚌', '✈️', '🚕'], oddIndex: 2, explanation: '✈️ flies in the sky, the rest are road vehicles!' },
    { items: ['👶', '👧', '👦', '🤖'], oddIndex: 3, explanation: '🤖 is a robot, the rest are people!' },
    { items: ['🌍', '🌙', '⭐', '🎈'], oddIndex: 3, explanation: '🎈 is a balloon, the rest are in space!' },
  ],
  [
    { items: ['🎹', '🎸', '🎺', '🎨'], oddIndex: 3, explanation: '🎨 is for painting, the rest are instruments!' },
    { items: ['☀️', '🌧️', '❄️', '🎮'], oddIndex: 3, explanation: '🎮 is a game controller, the rest are weather!' },
    { items: ['2️⃣', '4️⃣', '6️⃣', '5️⃣'], oddIndex: 3, explanation: '5️⃣ is odd, the rest are even numbers!' },
  ],
  [
    { items: ['🍎', '🍓', '🫐', '🍌'], oddIndex: 3, explanation: '🍌 is yellow, the rest are red/blue!' },
    { items: ['🐕', '🐈', '🐹', '🐢'], oddIndex: 3, explanation: '🐢 is a reptile, the rest are mammals!' },
    { items: ['🟦', '🟩', '🟥', '🔶'], oddIndex: 3, explanation: '🔶 is a diamond, the rest are squares!' },
  ],
];

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

const OddOneOutPage: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useApp();
  const [level, setLevel] = useState(1);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTrophy, setShowTrophy] = useState(false);

  const questions = allQuestions[Math.min(level - 1, allQuestions.length - 1)];
  const current = questions[qIdx];

  const handlePick = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const isCorrect = idx === current.oddIndex;
    if (isCorrect) {
      setScore(s => s + 1);
      showNotification('🎉 You found it!');
    } else {
      showNotification('❌ Not quite!');
    }
    setShowExplanation(true);
    setTimeout(() => {
      if (qIdx < questions.length - 1) {
        setQIdx(q => q + 1);
      } else if (level < 5) {
        showNotification(`🎉 Level ${level} Complete!`);
        setLevel(l => l + 1);
        setQIdx(0);
      } else {
        setShowTrophy(true);
        setTimeout(() => {
          setShowTrophy(false);
          navigate('/app/games');
        }, 4000);
      }
      setSelected(null);
      setShowExplanation(false);
    }, 2000);
  };

  return (
    <div className="game-page-shell">
      {showTrophy && (
        <div style={trophyOverlayStyle}>
          {Array.from({ length: 30 }).map((_, i) => <div key={i} style={confettiStyle(i)} />)}
          <div style={trophyStyle}>🏆</div>
          <h2 style={{ color: '#FFD700', fontSize: '2em', marginTop: '20px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>🎉 Great Eye! 🎉</h2>
          <p style={{ color: 'white', fontSize: '1.3em', marginTop: '10px' }}>You found all the odd ones out!</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1em', marginTop: '8px' }}>Score: {score}</p>
        </div>
      )}
      <div className="controls">
        <button className="control-btn exit-btn" onClick={() => navigate('/app/games')}>🚪 Exit</button>
        <button className="control-btn" onClick={() => { setLevel(1); setQIdx(0); setScore(0); }}>🔄 Restart</button>
      </div>
      <div className="game-page-inner" style={{ maxWidth: '500px', textAlign: 'center' }}>
        <h2 style={{ color: 'white', marginBottom: '4px' }}>🔍 Odd One Out</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '8px 0 20px', color: 'rgba(255,255,255,0.7)', fontSize: '0.9em' }}>
          <span>Level {level}/5</span>
          <span>Score: {score}</span>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>
            Which one doesn't belong?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '300px', margin: '0 auto 16px' }}>
            {current.items.map((item, i) => (
              <button
                key={i}
                onClick={() => handlePick(i)}
                disabled={selected !== null}
                style={{
                  fontSize: '3em',
                  background: selected !== null
                    ? (i === current.oddIndex ? 'rgba(76,175,80,0.3)' : (i === selected ? 'rgba(244,67,54,0.3)' : 'rgba(255,255,255,0.05)'))
                    : 'rgba(255,255,255,0.08)',
                  border: selected !== null
                    ? (i === current.oddIndex ? '3px solid #4CAF50' : (i === selected && i !== current.oddIndex ? '3px solid #f44336' : '3px solid transparent'))
                    : '3px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '16px',
                  cursor: selected !== null ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item}
              </button>
            ))}
          </div>
          {showExplanation && (
            <div style={{
              background: 'rgba(255,215,0,0.1)',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#FFD700',
              fontSize: '0.9em',
              animation: 'popIn 0.3s ease-out',
            }}>
              {current.explanation}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OddOneOutPage;
