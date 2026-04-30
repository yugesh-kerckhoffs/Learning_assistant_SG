import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { apiChat, apiCheckQuota } from '@/lib/api';
import { processMarkdown } from '@/lib/markdown';
import { socialStories } from '@/data/gameData';
import { externalSupabase } from '@/lib/externalSupabase';
import { SOCIAL_STORIES_VIDEO_REDIRECT_MESSAGE } from '@/lib/prompts';
import { detectUserNickname, sanitizeStoredNickname } from '@/lib/nameDetection';
import VoiceRecorder from '@/components/VoiceRecorder';
import MessageFeedback from '@/components/MessageFeedback';

type SocialMessage = {
  role: 'user' | 'assistant';
  content: string;
  imageData?: string;
  mimeType?: string;
  goToChat?: boolean;
  goToContact?: boolean;
  showUpgrade?: boolean;
};

type StoryPreset = (typeof socialStories)[number];

const SOCIAL_KEYWORDS = [
  'social story', 'social stories', 'party', 'restaurant', 'hospital', 'dentist', 'salon', 'school',
  'classroom', 'friend', 'friends', 'meet', 'visit', 'go to', 'how to', 'what happens', 'new place',
  'first time', 'nervous', 'scared', 'worried', 'waiting', 'taking turns', 'saying hello', 'goodbye',
  'library', 'museum', 'zoo', 'park', 'playground', 'shop', 'grocery', 'market', 'bus', 'train',
  'airport', 'travel', 'trip', 'teacher', 'doctor', 'haircut', 'birthday',
];

const SOCIAL_IMAGE_REQUEST_KEYWORDS = [
  'tell me a social story', 'create a social story', 'generate social story', 'make social story',
  'draw social story', 'show social story', 'social story for', 'create image', 'generate image',
  'draw', 'picture', 'illustration', 'comic', 'show me',
];

const isSocialStoryRelated = (msg: string): boolean => {
  const lower = msg.toLowerCase();
  return SOCIAL_KEYWORDS.some(keyword => lower.includes(keyword));
};

const shouldGenerateSocialStoryImage = (msg: string): boolean => {
  const lower = msg.toLowerCase();
  return SOCIAL_IMAGE_REQUEST_KEYWORDS.some(keyword => lower.includes(keyword));
};

const SocialStoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, currentUserName, userRole, sessionToken, selectedCharacter } = useAuth();
  const { voiceEnabled, toggleVoice, currentVolume, setCurrentVolume, conversationHistory, setConversationHistory, showNotification } = useApp();

  const charEmoji = selectedCharacter === 'milo' ? '🐭' : '🐱';

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('Thinking... 🤔');
  const [showStoryPicker, setShowStoryPicker] = useState(false);
  const [selectedPresetStory, setSelectedPresetStory] = useState<StoryPreset | null>(null);
  const [messages, setMessages] = useState<SocialMessage[]>([
    {
      role: 'assistant',
      content: `Hi ${currentUserName}! 😊 Welcome to Social Stories!\n\nTap the 📚 button beside the chat box to open 5 story cards from the app.\n\nAsk social questions for text help, and ask me to create a social story image when you want a visual story. 🌟`,
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const speakReply = (text: string) => {
    if (!voiceEnabled) return;
    const cleanText = text.replace(/[*#_`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.78;
    utterance.pitch = 0.85;
    utterance.volume = Math.min(currentVolume, 0.9);
    speechSynthesis.speak(utterance);
  };

  const appendConversationHistory = (userText: string, assistantText: string) => {
    setConversationHistory(prev => {
      const updated = [...prev, { role: 'user', content: userText }, { role: 'assistant', content: assistantText }];
      return updated.length > 20 ? updated.slice(-20) : updated;
    });
  };

  const saveChatToDb = async (userMsg: string, assistantMsg: string) => {
    if (!currentUser?.id) return;
    try {
      await externalSupabase.from('chat_history').insert([
        { user_id: currentUser.id, role: 'user', message_text: userMsg, mode: 'social_stories' },
        { user_id: currentUser.id, role: 'assistant', message_text: assistantMsg, mode: 'social_stories' },
      ]);
    } catch (error) {
      console.error('Chat save error:', error);
    }
  };

  const handleTextSocialResponse = async (msg: string) => {
    setIsTyping(true);
    setTypingText('Thinking... 🤔');

    try {
      const result = await apiChat(msg, conversationHistory, userRole, sessionToken, currentUser?.id || null, currentUser?.email || null, false, selectedCharacter, currentUserName, sanitizeStoredNickname(sessionStorage.getItem('userNickname')));
      const reply = result.response || result.error || "I'm here to help with social stories! 😊";

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      appendConversationHistory(msg, reply);
      saveChatToDb(msg, reply);
      speakReply(reply);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ **Unable to connect to the server right now.** Please try again later. 😔" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleImageSocialResponse = async (msg: string) => {
    // Pre-check quota before starting generation
    const quota = await apiCheckQuota('image');
    if (!quota.allowed) {
      let content = '';
      let showUpgrade = false;
      if (quota.reason === 'image_limit') {
        content = `🖼️ **Image credits exhausted!** 😔\n\nYou've used **${quota.imagesUsed}/${quota.imagesLimit}** images this month.\n\nYour image credits will **renew on the 1st of next month**. 📅\n\n${quota.plan === 'free' ? '💡 **Tip:** Upgrade to **Pro** for 100 images/month!' : 'Your credits will reset soon. Thank you for being a Pro member! 🌟'}`;
        showUpgrade = quota.plan === 'free';
      }
      setMessages(prev => [...prev, { role: 'assistant', content, showUpgrade }]);
      return;
    }

    setIsTyping(true);
    setTypingText('Sketching your social story... 🎨');

    try {
      const result = await apiChat(msg, conversationHistory, userRole, sessionToken, currentUser?.id || null, currentUser?.email || null, true, selectedCharacter, currentUserName, sanitizeStoredNickname(sessionStorage.getItem('userNickname')));

      const hasImage = Boolean(result.imageData && result.mimeType);
      let reply = result.response || result.error || "I am trying to create your social story image! 🎨";

      if (!hasImage && /created an image|here's your social story|i created/i.test(reply.toLowerCase())) {
        reply = 'I could not render the image this time. Please try again and I will sketch it again. 🎨';
      }

      const assistantMessage: SocialMessage = {
        role: 'assistant',
        content: reply,
        ...(hasImage ? { imageData: result.imageData, mimeType: result.mimeType } : {}),
        ...(result.quotaExceeded ? { showUpgrade: result.quotaType === 'image' } : {}),
      };

      setMessages(prev => [...prev, assistantMessage]);
      appendConversationHistory(msg, reply);
      saveChatToDb(msg, reply);
      speakReply(reply);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ **Unable to connect to the server right now.** Please try again later. 😔" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleStoryClick = (storyId: string) => {
    const story = socialStories.find(item => item.id === storyId);
    if (!story) return;
    setShowStoryPicker(false);
    setSelectedPresetStory(story);
  };

  const clearChat = () => {
    setSelectedPresetStory(null);
    setShowStoryPicker(false);
    setMessages([{ role: 'assistant', content: `Chat cleared! Tap 📚 to pick a story, or ask me a social story question. 😊` }]);
    setConversationHistory([]);
    showNotification('🗑️ Chat cleared!');
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('📥 Downloaded!');
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

    setIsTyping(true);
    setTypingText('Thinking... 🤔');

    try {
      // Use backend to classify social stories intent
      const classifyResult = await apiChat(msg, conversationHistory, userRole, sessionToken, currentUser?.id || null, currentUser?.email || null, false, selectedCharacter, currentUserName, sanitizeStoredNickname(sessionStorage.getItem('userNickname')), 'social_classify');
      const intent = classifyResult.socialIntent || 'not_social';
      setIsTyping(false);

      if (intent === 'social_image') {
        await handleImageSocialResponse(msg);
        return;
      }

      if (intent === 'social_text') {
        await handleTextSocialResponse(msg);
        return;
      }

      // NOT_SOCIAL - check if it's a video request
      const lower = msg.toLowerCase();
      if (lower.includes('video') || lower.includes('animate') || lower.includes('animation')) {
        setMessages(prev => [...prev, { role: 'assistant', content: SOCIAL_STORIES_VIDEO_REDIRECT_MESSAGE, goToContact: true }]);
        return;
      }

      const redirectMsg = `That question is outside Social Stories. 😊\n\nPlease use **General Chat** for non-social questions.\n\nYou can also ask social topics here, like "Tell me a social story for going to a restaurant". 📚`;
      setMessages(prev => [...prev, { role: 'assistant', content: redirectMsg, goToChat: true }]);
      appendConversationHistory(msg, redirectMsg);
      saveChatToDb(msg, redirectMsg);
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ **Unable to connect to the server right now.** Please try again later. 😔" }]);
    }
  };

  const [presetImageLoaded, setPresetImageLoaded] = useState(false);

  useEffect(() => {
    if (selectedPresetStory) setPresetImageLoaded(false);
  }, [selectedPresetStory]);

  if (selectedPresetStory) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', gap: '14px', justifyContent: 'center', alignItems: 'center', padding: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem', textAlign: 'center' }}>{selectedPresetStory.title}</h2>
        <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '68vh' }}>
          {!presetImageLoaded && (
            <div style={{
              width: '320px', maxWidth: '100%', height: '240px',
              borderRadius: '14px',
              background: 'linear-gradient(110deg, rgba(255,255,255,0.06) 8%, rgba(255,255,255,0.15) 18%, rgba(255,255,255,0.06) 33%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s linear infinite',
              border: '2px solid rgba(255,255,255,0.15)',
            }} />
          )}
          <img
            src={selectedPresetStory.image}
            alt={selectedPresetStory.title}
            onLoad={() => setPresetImageLoaded(true)}
            style={{
              maxWidth: '100%', maxHeight: '68vh', borderRadius: '14px',
              border: '2px solid rgba(255,255,255,0.3)',
              display: presetImageLoaded ? 'block' : 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="control-btn" onClick={() => setSelectedPresetStory(null)}>← Back to Social Stories</button>
          <button
            className="control-btn"
            onClick={() => downloadFile(selectedPresetStory.image, `${selectedPresetStory.id}-story.jpg`)}
          >
            📥 Download
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div className="controls" style={{ flexShrink: 0 }}>
        <button className="control-btn" onClick={clearChat}>🗑️ Clear</button>
        <button className="control-btn" onClick={toggleVoice}>{voiceEnabled ? '🔊 Voice' : '🔇 Voice'}</button>
        <div className="setting-item">
          <span>🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={currentVolume}
            onChange={e => setCurrentVolume(parseFloat(e.target.value))}
            className="volume-slider"
          />
        </div>
      </div>

      <div className="messages" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className="message-avatar">{msg.role === 'user' ? '👤' : charEmoji}</div>
            <div className="message-content">
              <div dangerouslySetInnerHTML={{ __html: processMarkdown(msg.content) }} />

              {msg.imageData && msg.mimeType && (
                <div style={{ margin: '10px 0' }}>
                  <img
                    src={`data:${msg.mimeType};base64,${msg.imageData}`}
                    alt="Generated social story"
                    style={{ maxWidth: '100%', borderRadius: '10px', border: '2px solid rgba(255,255,255,0.3)' }}
                  />
                  <div style={{ marginTop: '8px' }}>
                    <button
                      onClick={() => downloadFile(`data:${msg.mimeType};base64,${msg.imageData}`, `social-story-${Date.now()}.png`)}
                      style={{ background: 'linear-gradient(135deg, #4fc3f7, #29b6f6)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: 'white', cursor: 'pointer', fontSize: '0.9em' }}
                    >
                      📥 Download
                    </button>
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
              {msg.role === 'assistant' && !msg.showUpgrade && (
                <MessageFeedback
                  botResponse={msg.content}
                  userQuestion={(() => {
                    for (let j = index - 1; j >= 0; j--) {
                      if (messages[j].role === 'user') return messages[j].content;
                    }
                    return undefined;
                  })()}
                  source="social_stories"
                />
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="message assistant typing-indicator">
            <div className="message-avatar">{typingText.toLowerCase().includes('sketch') ? '🎨' : charEmoji}</div>
            <div className="message-content">{typingText}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {showStoryPicker && (
        <div style={{
          flexShrink: 0,
          padding: '8px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '14px',
          marginBottom: '6px',
          maxHeight: '35vh',
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px' }}>
            {socialStories.map((story) => (
              <button
                key={story.id}
                onClick={() => handleStoryClick(story.id)}
                style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  padding: '10px 8px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'inherit',
                  fontSize: '0.82em',
                  fontWeight: 600,
                  transition: 'transform 0.2s',
                  minHeight: '44px',
                }}
              >
                <span style={{ fontSize: '1.2em' }}>{story.title.split(' ')[0]}</span>
                <span>{story.title.slice(story.title.indexOf(' ') + 1)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="input-area" style={{ flexShrink: 0 }}>
        <button
          onClick={() => setShowStoryPicker(!showStoryPicker)}
          style={{
            background: showStoryPicker ? 'rgba(79,195,247,0.3)' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '10px',
            padding: '8px 10px',
            cursor: 'pointer',
            fontSize: '1.3em',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
          title="Pick a social story"
          aria-label="Open social story cards"
        >
          📚
        </button>

        <VoiceRecorder onTranscript={(text) => setInputMessage(prev => prev ? prev + ' ' + text : text)} disabled={isTyping} />

        <input
          className="input-field"
          placeholder="Ask a social question or request a social story image... 🌟"
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value.slice(0, 2000))}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          disabled={isTyping}
          maxLength={2000}
        />

        <button className="send-button" onClick={sendMessage} disabled={isTyping || !inputMessage.trim()}>➤</button>
      </div>
    </div>
  );
};

export default SocialStoriesPage;
