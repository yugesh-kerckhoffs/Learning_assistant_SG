import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { apiChat } from '@/lib/api';
import { processMarkdown } from '@/lib/markdown';
import { feelings } from '@/data/gameData';
import MessageFeedback from '@/components/MessageFeedback';
import { FEELINGS_CONTEXT_PREFIX, FEELINGS_HELPER_REDIRECT_MESSAGE, checkIfImageRequest, checkIfVideoRequest } from '@/lib/prompts';
import { detectUserNickname, sanitizeStoredNickname } from '@/lib/nameDetection';
import VoiceRecorder from '@/components/VoiceRecorder';

const FeelingsHelperPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, currentUserName, userRole, sessionToken, selectedCharacter } = useAuth();
  const { voiceEnabled, toggleVoice, currentVolume, setCurrentVolume, conversationHistory, setConversationHistory, showNotification } = useApp();

  const charEmoji = selectedCharacter === 'milo' ? '🐭' : '🐱';
  const charName = selectedCharacter === 'milo' ? 'Milo' : 'Leo';

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showFeelings, setShowFeelings] = useState(false);
  const [feelingsHistory, setFeelingsHistory] = useState<{ role: string; content: string }[]>([]);
  const [messages, setMessages] = useState<{ role: string; content: string; goToChat?: boolean }[]>([
    { role: 'assistant', content: `Hi ${currentUserName}! 😊 I'm ${charName} ${charEmoji}. How are you feeling today? Tap the 😊 button to pick a feeling, or just type to tell me! 🌟` }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFeelingClick = async (feelingKey: string) => {
    const feeling = feelings[feelingKey];
    if (!feeling) return;
    setShowFeelings(false);

    const userMsg = `I'm feeling ${feeling.name} ${feeling.emoji}`;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const result = await apiChat(userMsg, [
        { role: 'user', content: FEELINGS_CONTEXT_PREFIX + 'Hello' },
        { role: 'assistant', content: 'I understand. I am in Feelings Helper mode and will provide emotional support.' },
        ...feelingsHistory
      ], userRole, sessionToken, currentUser?.id || null, currentUser?.email || null, false, selectedCharacter, currentUserName, sanitizeStoredNickname(sessionStorage.getItem('userNickname')));
      const reply = result.response || feeling.prompt;

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setFeelingsHistory(prev => [...prev, { role: 'user', content: userMsg }, { role: 'assistant', content: reply }]);

      if (voiceEnabled) {
        const utterance = new SpeechSynthesisUtterance(reply.replace(/[*#_`]/g, ''));
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        speechSynthesis.speak(utterance);
      }
    } catch {
      // Fallback to static prompt if API fails
      setMessages(prev => [...prev, { role: 'assistant', content: feeling.prompt }]);
      setFeelingsHistory(prev => [...prev, { role: 'user', content: userMsg }, { role: 'assistant', content: feeling.prompt }]);
    }
    setIsTyping(false);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;
    const msg = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);

    const detectedNick = detectUserNickname(msg);
    if (detectedNick) {
      sessionStorage.setItem('userNickname', detectedNick);
    }

    // Block image/video generation requests in feelings helper
    const isImageReq = checkIfImageRequest(msg);
    const isVideoReq = checkIfVideoRequest(msg);

    if (isImageReq || isVideoReq) {
      setMessages(prev => [...prev, { role: 'assistant', content: FEELINGS_HELPER_REDIRECT_MESSAGE, goToChat: true }]);
      return;
    }

    setIsTyping(true);

    try {
      const result = await apiChat(msg, [
        { role: 'user', content: FEELINGS_CONTEXT_PREFIX + 'Hello' },
        { role: 'assistant', content: 'I understand. I am in Feelings Helper mode and will provide emotional support.' },
        ...feelingsHistory
      ], userRole, sessionToken, currentUser?.id || null, currentUser?.email || null, false, selectedCharacter, currentUserName, sanitizeStoredNickname(sessionStorage.getItem('userNickname')));
      const reply = result.response || result.error || "I'm here to help! 😊";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setFeelingsHistory(prev => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: reply }]);
      setConversationHistory(prev => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: reply }]);
      if (voiceEnabled) {
        const utterance = new SpeechSynthesisUtterance(reply.replace(/[*#_`]/g, ''));
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        speechSynthesis.speak(utterance);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ **Unable to connect to the server right now.** Please try again later. 😔", isError: true } as any]);
    }
    setIsTyping(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Controls */}
      <div className="controls" style={{ flexShrink: 0 }}>
        <button className="control-btn" onClick={() => {
          setMessages([{ role: 'assistant', content: `Hi ${currentUserName}! 😊 I'm ${charName} ${charEmoji}. How are you feeling today? Tap the 😊 button to pick a feeling, or just type to tell me! 🌟` }]);
          setFeelingsHistory([]);
          setConversationHistory([]);
          showNotification('🗑️ Chat cleared!');
        }}>🗑️ Clear</button>
        <button className="control-btn" onClick={toggleVoice}>{voiceEnabled ? '🔊 Voice' : '🔇 Voice'}</button>
        <div className="setting-item">
          <span>🔊</span>
          <input type="range" min="0" max="1" step="0.1" value={currentVolume} onChange={e => setCurrentVolume(parseFloat(e.target.value))} className="volume-slider" />
        </div>
      </div>

      {/* Chat messages */}
      <div className="messages" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">{msg.role === 'user' ? '👤' : charEmoji}</div>
            <div className="message-content">
              <div dangerouslySetInnerHTML={{ __html: processMarkdown(msg.content) }} />
              {msg.goToChat && (
                <button
                  onClick={() => navigate('/app/chat')}
                  style={{
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    color: 'white',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.95em',
                    fontWeight: 600,
                    marginTop: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  💬 Go to General Chat
                </button>
              )}
              {msg.role === 'assistant' && (
                <MessageFeedback
                  botResponse={msg.content}
                  userQuestion={(() => {
                    for (let j = i - 1; j >= 0; j--) {
                      if (messages[j].role === 'user') return messages[j].content;
                    }
                    return undefined;
                  })()}
                  source="feelings_helper"
                />
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="message assistant typing-indicator">
            <div className="message-avatar">{charEmoji}</div>
            <div className="message-content">Thinking... 🤔</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Feelings popup panel - appears above input */}
      {showFeelings && (
        <div style={{
          flexShrink: 0, padding: '8px', background: 'rgba(255,255,255,0.08)',
          borderRadius: '14px', marginBottom: '6px', maxHeight: '35vh', overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {Object.entries(feelings).map(([key, f]) => (
              <button key={key} onClick={() => handleFeelingClick(key)} style={{
                background: f.color, border: '2px solid rgba(255,255,255,0.3)', borderRadius: '12px',
                padding: '8px 4px', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '2px', fontFamily: 'inherit', fontSize: '0.75em', fontWeight: 600,
                transition: 'transform 0.2s', minHeight: '52px',
              }}>
                <span style={{ fontSize: '1.6em' }}>{f.emoji}</span>
                <span>{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area with feelings toggle */}
      <div className="input-area" style={{ flexShrink: 0 }}>
        <button
          onClick={() => setShowFeelings(!showFeelings)}
          style={{
            background: showFeelings ? 'rgba(79,195,247,0.3)' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px',
            padding: '8px 10px', cursor: 'pointer', fontSize: '1.3em', flexShrink: 0,
            transition: 'all 0.2s',
          }}
          title="Pick a feeling"
        >
          😊
        </button>
        <VoiceRecorder onTranscript={(text) => setInputMessage(prev => prev ? prev + ' ' + text : text)} disabled={isTyping} />
        <input className="input-field" placeholder="Tell me how you're feeling... 💬" value={inputMessage} onChange={e => setInputMessage(e.target.value.slice(0, 2000))} onKeyDown={e => e.key === 'Enter' && sendMessage()} disabled={isTyping} maxLength={2000} />
        <button className="send-button" onClick={sendMessage} disabled={isTyping || !inputMessage.trim()}>➤</button>
      </div>
    </div>
  );
};

export default FeelingsHelperPage;
