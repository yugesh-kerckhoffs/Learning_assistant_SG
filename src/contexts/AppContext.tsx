import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { themes } from '@/data/gameData';

type AppMode = 'general' | 'socialStories' | 'calmBreathing' | 'feelingsHelper' | 'memoryGame' | 'colorsShapes' | 'gallery';

interface AppContextType {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  currentThemeIndex: number;
  changeTheme: () => void;
  themeBackground: string;
  voiceEnabled: boolean;
  toggleVoice: () => void;
  currentVolume: number;
  setCurrentVolume: (v: number) => void;
  showNotification: (msg: string) => void;
  conversationHistory: any[];
  setConversationHistory: React.Dispatch<React.SetStateAction<any[]>>;
  userLevel: number;
  setUserLevel: (l: number) => void;
  sessionStartTime: number;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>('general');
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0.5);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [userLevel, setUserLevel] = useState(1);
  const [sessionStartTime] = useState(Date.now());
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const changeTheme = useCallback(() => {
    setCurrentThemeIndex(i => (i + 1) % themes.length);
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(v => {
      if (v) speechSynthesis.cancel();
      return !v;
    });
  }, []);

  const showNotification = useCallback((message: string) => {
    const existing = document.getElementById('app-notification');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'app-notification';
    el.textContent = message;
    el.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #66bb6a, #4caf50); color: white;
      padding: 16px 24px; border-radius: 15px; font-size: 1em; z-index: 10001;
      border: 2px solid rgba(255,255,255,0.3); max-width: 90%; text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3); animation: popIn 0.5s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, "Comic Sans MS", "Segoe UI", "Roboto", sans-serif;
    `;
    document.body.appendChild(el);

    if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    notificationTimeoutRef.current = setTimeout(() => {
      el.style.transition = 'opacity 0.5s ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 500);
    }, 3000);
  }, []);

  const themeBackground = themes[currentThemeIndex].bg;

  return (
    <AppContext.Provider value={{
      mode, setMode, currentThemeIndex, changeTheme, themeBackground,
      voiceEnabled, toggleVoice, currentVolume, setCurrentVolume,
      showNotification, conversationHistory, setConversationHistory,
      userLevel, setUserLevel, sessionStartTime,
    }}>
      {children}
    </AppContext.Provider>
  );
}
