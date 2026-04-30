// ==========================================
// Centralized Prompts — Frontend
// All prompts used in the frontend are defined here for easy management.
// ==========================================

export const FEELINGS_CONTEXT_PREFIX = `[FEELINGS HELPER MODE] The child is using the Feelings Helper. Your role is to be a caring emotional support companion. CRITICAL RULES FOR THIS MODE:
1. ALWAYS take the child's feelings seriously - never dismiss, minimize, or redirect away from their concern
2. ALWAYS acknowledge what they said and validate their feelings first
3. Provide gentle, age-appropriate guidance on how to handle or solve the situation they describe
4. Remember previous messages in this conversation and respond accordingly
5. If they describe a problem, help them work through it step by step
6. NEVER say "let's talk about something else" or change the topic - stay focused on helping them
7. Use empathy, warmth, and practical child-friendly advice
8. If they mention abuse, bullying, or danger, follow the safety protocol immediately
9. Do NOT generate images or videos in this mode - this is purely emotional support
10. If the user asks for image or video generation, gently redirect them to General Chat
11. Keep responses under 300 words and always complete your paragraphs fully.

The child says: `;

export const FEELINGS_HELPER_REDIRECT_MESSAGE = `🌈 **This page is for emotional support only.** 😊\n\nFor image generation, video generation, or general questions, please go to **General Chat**!\n\nHere, I'm your caring companion to help you with your feelings and emotions. 💙\n\nTell me how you're feeling, and I'll help you work through it! 🌟`;

export const SOCIAL_STORIES_VIDEO_REDIRECT_MESSAGE = `🎬 **Video generation is not available yet.** 😊\n\nSocial Stories supports **text** and **image** generation only.\n\n🚧 **Video generation is coming soon — only for Enterprise users.** Free and Pro users do not have access to video generation right now. If you need video generation for your school or organization, please contact us! 🌟`;

export const VIDEO_NOT_AVAILABLE_MESSAGE = `🎬 **Video generation feature is not available yet.** 🚧\n\nThis feature is **not available for Free or Pro users** right now — it is only planned for **Enterprise users**.\n\n💡 If you need video generation for your school or organization, please **contact us** using the button below. 🌟`;

// Keywords for detecting image generation requests
export const IMAGE_KEYWORDS = [
  'generate image', 'create image', 'make image', 'draw', 'picture of',
  'show me image', 'create picture', 'generate picture', 'make picture',
  'draw me', 'create drawing', 'make drawing', 'image of',
  'generate photo', 'create photo', 'illustration', 'sketch', 'paint',
  'show me a photo', 'can you draw', 'show me what', 'looks like',
];

// Keywords for detecting video generation requests
export const VIDEO_KEYWORDS = [
  'generate video', 'create video', 'make video', 'video of',
  'show me video', 'create animation', 'make animation', 'animate',
  'video clip',
];

export function checkIfImageRequest(message: string): boolean {
  return IMAGE_KEYWORDS.some(k => message.toLowerCase().includes(k));
}

export function checkIfVideoRequest(message: string): boolean {
  return VIDEO_KEYWORDS.some(k => message.toLowerCase().includes(k));
}

// Nickname detection from user messages
export function detectNickname(message: string): string | null {
  const patterns = [
    /call me (\w+)/i,
    /my name is (\w+)/i,
    /you can call me (\w+)/i,
    /just call me (\w+)/i,
    /i(?:'m| am) (\w+)/i,
  ];
  for (const p of patterns) {
    const match = message.match(p);
    if (match && match[1].length > 1 && match[1].length < 20) {
      return match[1];
    }
  }
  return null;
}
