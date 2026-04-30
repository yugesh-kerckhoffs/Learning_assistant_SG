// ==========================================
// Nickname detection helper
// Stores temporary nickname only when user intent is explicit
// ==========================================

const DISALLOWED_NAME_WORDS = new Set([
  'feel', 'feeling', 'feelings', 'nervous', 'sad', 'happy', 'worried', 'scared', 'afraid', 'angry', 'upset',
  'stressed', 'tired', 'lonely', 'confused', 'sick', 'good', 'bad', 'fine', 'okay', 'ok', 'great',
  'awesome', 'today', 'tomorrow', 'yesterday', 'really', 'very', 'super', 'just', 'name', 'called',
  'anxious', 'excited', 'sleepy', 'hungry', 'thirsty', 'bored', 'mad', 'calm', 'better', 'worse',
  'hurt', 'hurting', 'unsafe', 'safe', 'shy', 'embarrassed', 'ashamed'
]);

const EMOTION_PHRASE_PATTERN = /\b(?:i feel|i am feeling|i'm feeling|im feeling)\s+(?:very\s+|really\s+|so\s+|super\s+)?(?:a\s+bit\s+)?(?:feeling\s+)?(nervous|sad|happy|worried|scared|afraid|angry|upset|stressed|tired|lonely|confused|sick|okay|ok|fine|good|bad|anxious|excited|sleepy|hungry|thirsty|bored|mad|calm|hurt|unsafe|safe|shy|embarrassed|ashamed)\b/i;

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim();
}

function isValidNamePart(part: string): boolean {
  if (!part || part.length < 2 || part.length > 20) return false;
  if (!/^[a-zA-Z][a-zA-Z'-]*$/.test(part)) return false;
  if (/(?:ing|ed|ly)$/i.test(part)) return false;
  return !DISALLOWED_NAME_WORDS.has(part.toLowerCase());
}

function normalizeCandidate(parts: string[]): string | null {
  const cleaned = parts
    .map(p => p.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (cleaned.length === 0) return null;
  if (!cleaned.every(isValidNamePart)) return null;

  return toTitleCase(cleaned.join(' '));
}

export function sanitizeStoredNickname(value: string | null): string | null {
  if (!value) return null;

  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;

  return normalizeCandidate(cleaned.split(' '));
}

export function detectUserNickname(message: string): string | null {
  if (!message) return null;

  const text = message.trim().replace(/\s+/g, ' ');
  if (EMOTION_PHRASE_PATTERN.test(text)) return null;

  // Explicit, high-confidence name intent patterns only
  const explicitPatterns: RegExp[] = [
    /(?:^|\b)(?:my name is|my name's|you can call me|call me|i go by|i am called|i'm called|my nickname is)\s+([a-zA-Z][a-zA-Z'-]{1,19})(?:\s+([a-zA-Z][a-zA-Z'-]{1,19}))?\b/i,
    /^\s*i(?:'m| am)\s+([a-zA-Z][a-zA-Z'-]{1,19})(?:\s+([a-zA-Z][a-zA-Z'-]{1,19}))?\s*[.!?]*\s*$/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const candidate = normalizeCandidate([match[1] || '', match[2] || '']);
    if (candidate) return candidate;
  }

  return null;
}
