import React, { useState } from 'react';
import { externalSupabase } from '@/lib/externalSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';

type ReactionType = 'thumbs_up' | 'thumbs_down' | 'heart';

interface MessageFeedbackProps {
  /** The bot's response that the user is reacting to */
  botResponse: string;
  /** The user's question that prompted this bot response (if any) */
  userQuestion?: string;
  /** Surface where the feedback originated, e.g. 'chat', 'social_stories', 'feelings_helper' */
  source: string;
}

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'thumbs_up', emoji: '👍', label: 'Thumbs up' },
  { type: 'thumbs_down', emoji: '👎', label: 'Thumbs down' },
  { type: 'heart', emoji: '❤️', label: 'Heart' },
];

const MessageFeedback: React.FC<MessageFeedbackProps> = ({ botResponse, userQuestion, source }) => {
  const { currentUser } = useAuth();
  const { showNotification } = useApp();
  const [selected, setSelected] = useState<ReactionType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleClick = async (reaction: ReactionType) => {
    if (submitting || selected === reaction) return;
    setSubmitting(true);
    const previous = selected;
    setSelected(reaction);

    try {
      const { error } = await externalSupabase.from('message_feedback').insert([{
        user_id: currentUser?.id || null,
        user_email: currentUser?.email || null,
        reaction,
        user_question: userQuestion || null,
        bot_response: botResponse,
        source,
      }]);

      if (error) throw error;
      showNotification(`You reacted with ${REACTIONS.find(r => r.type === reaction)?.emoji}`);
    } catch (err) {
      console.error('Feedback save failed:', err);
      setSelected(previous);
      showNotification('⚠️ Could not save reaction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '6px',
        marginTop: '8px',
        flexWrap: 'wrap',
      }}
    >
      {REACTIONS.map(r => {
        const isActive = selected === r.type;
        return (
          <button
            key={r.type}
            onClick={() => handleClick(r.type)}
            disabled={submitting}
            title={r.label}
            aria-label={r.label}
            style={{
              background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
              border: isActive ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px',
              padding: '4px 10px',
              cursor: submitting ? 'wait' : 'pointer',
              fontSize: '0.95em',
              transition: 'all 0.15s',
              transform: isActive ? 'scale(1.08)' : 'scale(1)',
              fontFamily: 'inherit',
            }}
          >
            {r.emoji}
          </button>
        );
      })}
    </div>
  );
};

export default MessageFeedback;
