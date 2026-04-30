import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface GameInfo {
  id: string;
  path: string;
  icon: string;
  name: string;
  desc: string;
  color: string;
  proOnly: boolean;
}

const games: GameInfo[] = [
  { id: 'colors', path: '/app/games/colors', icon: '🎨', name: 'Colors', desc: 'Match colors with their names', color: 'linear-gradient(135deg, #ff6b6b, #ffa726)', proOnly: false },
  { id: 'shapes', path: '/app/games/shapes', icon: '⬛', name: 'Shapes', desc: 'Match shapes with their names', color: 'linear-gradient(135deg, #4fc3f7, #29b6f6)', proOnly: false },
  { id: 'memory', path: '/app/games/memory', icon: '🎮', name: 'Memory Game', desc: 'Flip & match cards with Leo & Milo!', color: 'linear-gradient(135deg, #66bb6a, #43a047)', proOnly: false },
  { id: 'pattern', path: '/app/games/pattern', icon: '🧩', name: 'Pattern Completion', desc: 'Find the missing piece in the pattern', color: 'linear-gradient(135deg, #ab47bc, #7b1fa2)', proOnly: true },
  { id: 'oddoneout', path: '/app/games/odd-one-out', icon: '🔍', name: 'Odd One Out', desc: 'Spot what doesn\'t belong!', color: 'linear-gradient(135deg, #26c6da, #00838f)', proOnly: true },
  { id: 'wordbuilder', path: '/app/games/word-builder', icon: '🔤', name: 'Word Builder', desc: 'Build words from scrambled letters', color: 'linear-gradient(135deg, #ffa726, #ef6c00)', proOnly: true },
];

const GamesHubPage: React.FC = () => {
  const navigate = useNavigate();
  // Pro status is loaded once at app start in AuthContext, so this is instant.
  const { isPro, isProLoading } = useAuth();
  const loading = isProLoading;

  const handleGameClick = (game: GameInfo) => {
    if (game.proOnly && !isPro) return;
    navigate(game.path);
  };

  return (
    <div className="games-hub-page">
      <div style={{ width: '100%', maxWidth: '860px', margin: '0 auto', padding: '20px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.8em', marginBottom: '8px', color: 'white' }}>🎮 Games</h2>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginBottom: '24px', fontSize: '1em' }}>
          Choose a game to play and have fun learning!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {games.map(game => {
            const locked = game.proOnly && !isPro;
            return (
              <button
                key={game.id}
                onClick={() => handleGameClick(game)}
                style={{
                  position: 'relative',
                  background: locked ? 'rgba(255,255,255,0.05)' : game.color,
                  border: locked ? '2px dashed rgba(255,255,255,0.2)' : '2px solid transparent',
                  borderRadius: '16px',
                  padding: '24px 16px',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  opacity: locked ? 0.7 : 1,
                  overflow: 'hidden',
                  minHeight: '172px',
                }}
                onMouseEnter={e => { if (!locked) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
              >
                {game.proOnly && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: locked ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.25)',
                    border: `1px solid ${locked ? 'rgba(255,215,0,0.4)' : 'rgba(255,215,0,0.6)'}`,
                    borderRadius: '20px',
                    padding: '2px 10px',
                    fontSize: '0.7em',
                    fontWeight: 'bold',
                    color: '#FFD700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    {locked ? '🔒' : '⭐'} PRO
                  </div>
                )}

                <div style={{ fontSize: '2.5em', marginBottom: '8px', filter: locked ? 'grayscale(0.6)' : 'none' }}>
                  {game.icon}
                </div>
                <div style={{ fontSize: '1.1em', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                  {game.name}
                </div>
                <div style={{ fontSize: '0.8em', color: 'rgba(255,255,255,0.8)' }}>
                  {game.desc}
                </div>

                {locked && (
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                    padding: '12px 8px 8px',
                    fontSize: '0.75em',
                    color: '#FFD700',
                    fontWeight: '600',
                  }}>
                    🚧 Upgrade to Pro to unlock
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {!isPro && !loading && (
          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,165,0,0.1))',
            border: '1px solid rgba(255,215,0,0.25)',
            borderRadius: '12px',
            padding: '16px 20px',
          }}>
            <p style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: '4px', fontSize: '1em' }}>
              ⭐ Want more games?
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85em', marginBottom: '10px' }}>
              Upgrade to <strong style={{ color: '#FFD700' }}>Pro</strong> to unlock Pattern Completion, Odd One Out & Word Builder!
            </p>
            <button
              onClick={() => navigate('/app/account')}
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FFA000)',
                color: '#1a1a2e',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 24px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.9em',
              }}
            >
              View Plans 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamesHubPage;
