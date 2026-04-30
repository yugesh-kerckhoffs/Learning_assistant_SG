import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { apiChat, apiCheckQuota } from '@/lib/api';
import { processMarkdown } from '@/lib/markdown';
import { detectUserNickname, sanitizeStoredNickname } from '@/lib/nameDetection';
import { VIDEO_NOT_AVAILABLE_MESSAGE } from '@/lib/prompts';

import VoiceRecorder from '@/components/VoiceRecorder';
import MessageFeedback from '@/components/MessageFeedback';

interface ChatAreaProps {
  socialStoriesMode?: boolean;
  initialMessages?: { role: string; content: string }[];
}

const ChatArea: React.FC<ChatAreaProps> = ({ socialStoriesMode = false, initialMessages }) => {
  const navigate = useNavigate();
  const { currentUser, currentUserName, userRole, sessionToken, selectedCharacter } = useAuth();
  const { voiceEnabled, toggleVoice, currentVolume, setCurrentVolume, conversationHistory, setConversationHistory, showNotification } = useApp();

  const charEmoji = selectedCharacter === 'milo' ? '🐭' : '🐱';
  const charName = selectedCharacter === 'milo' ? 'Milo' : 'Leo';

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('Thinking... 🤔');
  const [generationMode, setGenerationMode] = useState<'image' | 'video' | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string; imageData?: string; mimeType?: string; showUpgrade?: boolean; isError?: boolean; goToChat?: boolean; goToContact?: boolean }[]>(
    initialMessages || (socialStoriesMode
      ? [{ role: 'assistant', content: `Hi ${currentUserName}! 😊 I'd love to help you explore social stories! Ask me about any social situation like going to a party, visiting the dentist, or meeting new friends and I'll share a helpful story with pictures or text! 🌟📚` }]
      : [{ role: 'assistant', content: `✨ **Hi ${currentUserName}!** 🌟\n\nI'm ${charName} ${charEmoji} and I'm so excited to chat with you today! 🌈💬\n\nWe can talk, imagine fun stories, learn cool things, giggle together 😄🎨📚,\n\nand **I can even generate cute pictures for you!** 🖼️✨\n\n_Examples:_\n\n- "Draw a happy puppy" → I'll create an image 🎨\n\n- "What is the sun?" → I'll explain it 💬` }]
    )
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: `Chat cleared! How can I help you? 😊` }]);
    setConversationHistory([]);
    setGenerationMode(null);
    showNotification('🗑️ Chat cleared!');
  };

  const showHelp = () => {
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `## 🤖 How to use the Learning Assistant\n\n**Chat Features:**\n- Click **${charName}** ${charEmoji} to greet them\n- Type messages to chat about *anything*\n- Use control buttons for features\n- Use the 🔧 button to select Image or Video mode\n\n**What I can help with:**\n1. **Answering questions** - Ask me anything!\n2. **Explaining concepts** - I'll break it down\n3. **Creative writing** - Stories, poems, ideas\n4. **Problem solving** - Let's work together\n5. **Fun conversations** - Just chat and have fun!\n6. **Social Stories** - Visual stories to learn situations\n7. **Calm Breathing** - Relax with nature sounds\n8. **Feelings Helper** - Share and talk about your emotions\n9. **Memory Game** - Fun matching game with levels!\n\n**Tips:**\n- I understand *markdown* formatting\n- Ask follow-up questions\n- Be specific for better help\n- **Celebrate your progress!** 🎉\n\n*What would you like to explore together?* 🌟`
    }]);
  };

  const celebrateProgress = () => {
    showNotification(`🎉 Amazing work! ${charName} is so proud! 🌟`);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `## 🎉 **AMAZING WORK!** 🎉\n\n**${charName} is SO proud of you!** ${charEmoji}\n\n*You're doing fantastic by:*\n- Asking great questions\n- Being curious and engaged\n- Making excellent progress\n\n### ⭐ Keep up the wonderful work! ⭐\n\n*What would you like to learn about next?* 🌈`
    }]);
  };

  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('📥 Downloaded!');
  };

  const MAX_INPUT_LENGTH = 2000;

  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;
    const msg = inputMessage.trim().slice(0, MAX_INPUT_LENGTH);
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);

    // Detect nickname from user message (explicit intent only)
    const detectedNick = detectUserNickname(msg);
    if (detectedNick) {
      sessionStorage.setItem('userNickname', detectedNick);
    }

    // Video mode is disabled for Free + Pro users — show "not available + Contact Us" without calling backend.
    if (generationMode === 'video') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: VIDEO_NOT_AVAILABLE_MESSAGE,
        goToContact: true,
      }]);
      return;
    }

    // Pre-check image quota if image mode is forced
    if (generationMode === 'image') {
      const quota = await apiCheckQuota('image');
      if (!quota.allowed && quota.reason === 'image_limit') {
        const content = `🖼️ **Image credits exhausted!** 😔\n\nYou've used **${quota.imagesUsed}/${quota.imagesLimit}** images this month.\n\nYour image credits will **renew on the 1st of next month**. 📅\n\n${quota.plan === 'free' ? '💡 **Tip:** Upgrade to **Pro** for 100 images/month!' : 'Your credits will reset soon. Thank you for being a Pro member! 🌟'}`;
        const showUpgrade = quota.plan === 'free';
        setMessages(prev => [...prev, { role: 'assistant', content, showUpgrade }]);
        return;
      }
    }

    setIsTyping(true);
    if (generationMode === 'image') setTypingText('Sketching... 🎨');
    else setTypingText('Thinking... 🤔');

    const rawStoredNickname = sessionStorage.getItem('userNickname');
    const userNickname = sanitizeStoredNickname(rawStoredNickname);
    if (rawStoredNickname && !userNickname) {
      sessionStorage.removeItem('userNickname');
    }

    try {
      const result = await apiChat(msg, conversationHistory, userRole, sessionToken, currentUser?.id || null, currentUser?.email || null, socialStoriesMode, selectedCharacter, currentUserName, userNickname, generationMode);
      const reply = result.response || result.error || "I'm here to help! 😊";

      const newMsg: any = { role: 'assistant', content: reply };

      // Backend says video is not available — show Contact Us button
      if (result.videoNotAvailable) {
        newMsg.goToContact = true;
      }

      if (result.imageGenerated && result.imageData) {
        newMsg.imageData = result.imageData;
        newMsg.mimeType = result.mimeType;
      }

      // Check for failed generation
      if (result.generationFailed) {
        newMsg.isError = true;
      }

      setMessages(prev => [...prev, newMsg]);
      setConversationHistory(prev => {
        const updated = [...prev, { role: 'user', content: msg }, { role: 'assistant', content: reply }];
        return updated.length > 20 ? updated.slice(-20) : updated;
      });

      if (voiceEnabled) {
        const cleanText = reply.replace(/[*#_`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.78;
        utterance.pitch = 0.85;
        utterance.volume = Math.min(currentVolume, 0.9);
        speechSynthesis.speak(utterance);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ **Unable to connect to the server right now.** Please try again later. If the issue persists, check your internet connection. 😔", isError: true }]);
    }
    setIsTyping(false);
  };

  const modeButton = () => {
    if (generationMode) {
      return (
        <button
          onClick={() => setGenerationMode(null)}
          style={{
            background: generationMode === 'image' ? 'rgba(255,152,0,0.3)' : 'rgba(156,39,176,0.3)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '10px',
            padding: '8px 10px',
            cursor: 'pointer',
            fontSize: '1em',
            flexShrink: 0,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#fff',
            fontFamily: 'inherit',
            fontWeight: 600,
          }}
          title={`Cancel ${generationMode} mode`}
        >
          {generationMode === 'image' ? '🖼️' : '🎬'} ✕
        </button>
      );
    }

    return (
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setShowModeSelector(!showModeSelector)}
          style={{
            background: showModeSelector ? 'rgba(79,195,247,0.3)' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '10px',
            padding: '8px 10px',
            cursor: 'pointer',
            fontSize: '1.3em',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
          title="Select generation mode"
        >
          ⚒️
        </button>
        {showModeSelector && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '6px',
            background: 'rgba(30,30,50,0.95)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '140px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}>
            <button
              onClick={() => { setGenerationMode('image'); setShowModeSelector(false); }}
              style={{
                background: 'rgba(255,152,0,0.15)',
                border: '1px solid rgba(255,152,0,0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9em',
                fontFamily: 'inherit',
                fontWeight: 600,
                textAlign: 'left',
              }}
            >
              🖼️ Image
            </button>
            <button
              onClick={() => { setGenerationMode('video'); setShowModeSelector(false); }}
              style={{
                background: 'rgba(156,39,176,0.15)',
                border: '1px solid rgba(156,39,176,0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9em',
                fontFamily: 'inherit',
                fontWeight: 600,
                textAlign: 'left',
              }}
            >
              🎬 Video
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="controls">
        <button className="control-btn" onClick={clearChat}>🗑️ Clear</button>
        <button className="control-btn" onClick={showHelp}>❓ Help</button>
        <button className="control-btn" onClick={celebrateProgress}>🎉 Celebrate</button>
        <button className="control-btn" onClick={toggleVoice}>{voiceEnabled ? '🔊 Voice' : '🔇 Voice'}</button>
        <div className="setting-item">
          <span>🔊</span>
          <input type="range" min="0" max="1" step="0.1" value={currentVolume} onChange={e => setCurrentVolume(parseFloat(e.target.value))} className="volume-slider" />
        </div>
      </div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">{msg.role === 'user' ? '👤' : msg.isError ? '⚠️' : charEmoji}</div>
            <div className="message-content">
              <div dangerouslySetInnerHTML={{ __html: processMarkdown(msg.content) }} />
              {msg.imageData && msg.mimeType && (
                <div style={{ margin: '10px 0' }}>
                  <img src={`data:${msg.mimeType};base64,${msg.imageData}`} alt="Generated" style={{ maxWidth: '100%', borderRadius: '10px', border: '2px solid rgba(255,255,255,0.3)' }} />
                  <div style={{ marginTop: '8px' }}>
                    <button onClick={() => downloadFile(`data:${msg.mimeType};base64,${msg.imageData}`, `image-${Date.now()}.png`)} style={{ background: 'linear-gradient(135deg, #4fc3f7, #29b6f6)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: 'white', cursor: 'pointer', fontSize: '0.9em' }}>📥 Download Image</button>
                  </div>
                </div>
              )}
              {msg.showUpgrade && (
                <button
                  onClick={() => navigate('/app/account')}
                  style={{
                    background: 'linear-gradient(135deg, #f9ca24, #f0932b)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    color: '#000',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.95em',
                    marginTop: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  🛡️ Go to Account Dashboard — Upgrade to Pro
                </button>
              )}
              {msg.goToContact && (
                <button
                  onClick={() => navigate('/enterprise')}
                  style={{
                    background: 'linear-gradient(135deg, #4fc3f7, #29b6f6)',
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
                  📨 Contact Us — Enterprise Inquiry
                </button>
              )}
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
              {msg.role === 'assistant' && !msg.showUpgrade && !msg.isError && (
                <MessageFeedback
                  botResponse={msg.content}
                  userQuestion={(() => {
                    for (let j = i - 1; j >= 0; j--) {
                      if (messages[j].role === 'user') return messages[j].content;
                    }
                    return undefined;
                  })()}
                  source={socialStoriesMode ? 'social_stories' : 'chat'}
                />
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="message assistant typing-indicator">
            <div className="message-avatar">{typingText.includes('video') ? '🎬' : typingText.includes('Sketch') ? '🎨' : charEmoji}</div>
            <div className="message-content">{typingText}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-area">
        <VoiceRecorder onTranscript={(text) => setInputMessage(prev => prev ? prev + ' ' + text : text)} disabled={isTyping} />
        {modeButton()}
        <input
          className="input-field"
          placeholder={generationMode === 'image' ? 'Describe the image you want... 🖼️' : generationMode === 'video' ? 'Video generation is not available yet 🚧' : 'Type your message here... 🌟'}
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value.slice(0, 2000))}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          disabled={isTyping}
          maxLength={2000}
        />
        <button className="send-button" onClick={sendMessage} disabled={isTyping || !inputMessage.trim()}>➤</button>
      </div>
    </>
  );
};

export default ChatArea;
