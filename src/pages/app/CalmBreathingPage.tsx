import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { sounds } from '@/data/gameData';

const CalmBreathingPage: React.FC = () => {
  const { currentVolume, setCurrentVolume } = useApp();
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [breathPhase, setBreathPhase] = useState<'in' | 'out'>('in');

  const toggleSound = (key: string) => {
    if (playingSound === key) {
      audioRef.current?.pause();
      setPlayingSound(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(sounds[key].file);
      audio.loop = true;
      audio.volume = currentVolume;
      audio.play().catch(() => {});
      audioRef.current = audio;
      setPlayingSound(key);
    }
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = currentVolume;
  }, [currentVolume]);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  // Breathing phase toggle
  useEffect(() => {
    const interval = setInterval(() => {
      setBreathPhase(p => p === 'in' ? 'out' : 'in');
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="calm-breathing-container">
      <h2 className="calm-breathing-title">🫁 Calm Breathing</h2>
      <p className="calm-breathing-subtitle">Take deep breaths and relax with calming sounds</p>

      {/* Breathing bubble */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
        <div className="breathing-animation" />
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1em', fontWeight: 600, marginTop: '8px' }}>
          {breathPhase === 'in' ? 'Breathe In... 🌬️' : 'Breathe Out... 😌'}
        </p>
      </div>

      {/* Volume control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '1.3em' }}>🔊</span>
        <input type="range" min="0" max="1" step="0.1" value={currentVolume} onChange={e => setCurrentVolume(parseFloat(e.target.value))} className="volume-slider" style={{ width: '160px' }} />
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85em' }}>{Math.round(currentVolume * 100)}%</span>
      </div>

      <div className="sound-options">
        {Object.entries(sounds).map(([key, sound]) => (
          <div key={key} className={`sound-card ${playingSound === key ? 'playing' : ''}`} onClick={() => toggleSound(key)}>
            <div className="sound-image">{sound.emoji}</div>
            <div className="sound-name">{sound.name}</div>
            <div className="sound-description">{sound.description}</div>
            <div className="play-indicator">🎵</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalmBreathingPage;
