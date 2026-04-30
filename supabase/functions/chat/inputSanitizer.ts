// ==========================================
// Input Sanitizer & Prompt Injection Prevention
// Protects against prompt injection, XSS, and malicious inputs
// ==========================================

// Maximum allowed message length (prevents abuse & token overflow)
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_CONVERSATION_HISTORY_LENGTH = 20;

// Patterns that indicate prompt injection attempts
const PROMPT_INJECTION_PATTERNS = [
  // Direct instruction overrides
  /ignore\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|rules?|prompts?|guidelines?)/i,
  /disregard\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|rules?|prompts?)/i,
  /forget\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|rules?|prompts?)/i,
  /override\s+(all\s+)?(previous|above|prior)?\s*(instructions?|rules?|prompts?|safety)/i,
  
  // System prompt extraction
  /what\s+(are|is)\s+your\s+(system\s+)?prompt/i,
  /show\s+(me\s+)?your\s+(system\s+)?(prompt|instructions?|rules?|guidelines?)/i,
  /repeat\s+(your\s+)?(system\s+)?(prompt|instructions?|initial)/i,
  /print\s+(your\s+)?(system\s+)?(prompt|instructions?)/i,
  /reveal\s+(your\s+)?(system\s+)?(prompt|instructions?|rules?)/i,
  /output\s+(your\s+)?(system\s+)?(prompt|instructions?)/i,
  
  // Role manipulation
  /you\s+are\s+now\s+(a|an|the)/i,
  /pretend\s+(to\s+be|you\s+are|you're)/i,
  /act\s+as\s+(if\s+you\s+are|a|an|the)/i,
  /roleplay\s+as/i,
  /switch\s+(to|into)\s+(a\s+)?different\s+(role|mode|persona)/i,
  /enter\s+(developer|admin|debug|jailbreak|god)\s+mode/i,
  /activate\s+(developer|admin|debug|jailbreak)\s+mode/i,
  /enable\s+(developer|admin|debug)\s+mode/i,
  
  // DAN-style jailbreaks
  /\bDAN\b.*\bjailbreak\b/i,
  /\bjailbreak\b.*\bDAN\b/i,
  /do\s+anything\s+now/i,
  /\bDAN\s+mode\b/i,
  
  // Delimiter/context manipulation
  /```system/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /<\|im_start\|>/i,
  /\[\/INST\]/i,
  
  // Encoding tricks
  /base64\s*decode/i,
  /eval\s*\(/i,
  /exec\s*\(/i,
  
  // Inappropriate content requests
  /generate\s+(adult|nsfw|explicit|porn|violent|gore)/i,
  /create\s+(adult|nsfw|explicit|porn|violent|gore)/i,
  /\b(nsfw|pornograph|explicit\s+content|gore|graphic\s+violence)\b/i,
  
  // Attempts to bypass safety
  /bypass\s+(safety|content\s+filter|restriction|guard)/i,
  /disable\s+(safety|content\s+filter|restriction|guard)/i,
  /turn\s+off\s+(safety|content\s+filter|restriction)/i,
  /remove\s+(safety|content\s+filter|restriction|guard)/i,
  /without\s+(safety|content\s+filter|restriction|guard)/i,
];

// Dangerous HTML/script patterns for XSS prevention
const XSS_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /<form/i,
  /<input/i,
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
];

export interface SanitizationResult {
  safe: boolean;
  sanitizedMessage: string;
  blockedReason?: string;
}

/**
 * Sanitize and validate user input for the chat system
 */
export function sanitizeUserInput(message: string): SanitizationResult {
  // 1. Check message exists and is string
  if (!message || typeof message !== 'string') {
    return { safe: false, sanitizedMessage: '', blockedReason: 'empty_message' };
  }

  // 2. Trim and check length
  let sanitized = message.trim();
  if (sanitized.length === 0) {
    return { safe: false, sanitizedMessage: '', blockedReason: 'empty_message' };
  }
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.slice(0, MAX_MESSAGE_LENGTH);
  }

  // 3. Remove null bytes and control characters (keep newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 4. Check for XSS patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(sanitized)) {
      // Strip the dangerous content rather than blocking
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
  }

  // 5. Check for prompt injection attempts
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      return {
        safe: false,
        sanitizedMessage: sanitized,
        blockedReason: 'prompt_injection',
      };
    }
  }

  return { safe: true, sanitizedMessage: sanitized };
}

/**
 * Sanitize conversation history entries
 */
export function sanitizeConversationHistory(history: any[]): any[] {
  if (!Array.isArray(history)) return [];
  
  return history
    .slice(-MAX_CONVERSATION_HISTORY_LENGTH)
    .filter(h => h && typeof h === 'object' && typeof h.content === 'string' && typeof h.role === 'string')
    .filter(h => ['user', 'assistant', 'model'].includes(h.role))
    .map(h => ({
      role: h.role,
      content: h.content.slice(0, MAX_MESSAGE_LENGTH).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''),
    }));
}

/**
 * Validate email format strictly
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Sanitize a generic text input (name, message, etc.)
 */
export function sanitizeTextInput(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/<[^>]*>/g, ''); // Strip HTML tags
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
