import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { runAbuseDetection } from './abuseDetection.ts';
import { sanitizeUserInput, sanitizeConversationHistory, MAX_MESSAGE_LENGTH } from './inputSanitizer.ts';
import { buildSystemPrompt, createChildFriendlyPrompt, createSocialStoryPrompt, INTENT_CLASSIFIER_PROMPT, SOCIAL_STORIES_CLASSIFIER_PROMPT, buildAbuseResponsePrompt } from './prompts.ts';

// Centralized "video not available" message — Free + Pro users cannot generate video.
// Only Enterprise users (planned) — direct them to Contact Us.
const VIDEO_NOT_AVAILABLE_MESSAGE = `🎬 **Video generation feature is not available yet.** 🚧\n\nThis feature is **not available for Free or Pro users** right now — it is only planned for **Enterprise users**.\n\n💡 If you need video generation for your school or organization, please **contact us** using the button below. 🌟`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ==========================================
// DIRECT GOOGLE GEMINI API — No Lovable dependency
// Model config: text = gemini-2.5-flash, images = gemini-3.1-flash-image-preview
// ==========================================

const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const CLASSIFIER_MODEL = 'gemini-2.5-flash-lite';

const IMAGE_HINT_REGEX = /\b(draw|sketch|paint|illustrate|image|picture|photo|render|portrait|wallpaper|generate image|create image|make image)\b/i;
const VIDEO_HINT_REGEX = /\b(video|animation|animate|clip|movie|reel|generate video|create video|make video)\b/i;
// Safety regex removed — abuse detection now runs on ALL messages via AI

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// ====== AI INTENT CLASSIFICATION ======
async function classifyIntent(apiKey: string, message: string, forcedMode: string | null): Promise<'text' | 'image' | 'video'> {
  try {
    const prompt = INTENT_CLASSIFIER_PROMPT
      .replace('{FORCED_MODE}', forcedMode || 'none')
      .replace('{MESSAGE}', message);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CLASSIFIER_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 10, temperature: 0.1 },
      }),
    });

    if (!response.ok) {
      console.error('Classifier API error:', response.status);
      // Fallback: honor forced mode or default to text
      if (forcedMode === 'image') return 'image';
      if (forcedMode === 'video') return 'video';
      return 'text';
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();
    if (result?.includes('IMAGE')) return 'image';
    if (result?.includes('VIDEO')) return 'video';
    return 'text';
  } catch (e) {
    console.error('Classifier error:', e);
    if (forcedMode === 'image') return 'image';
    if (forcedMode === 'video') return 'video';
    return 'text';
  }
}

// ====== SOCIAL STORIES INTENT CLASSIFICATION ======
async function classifySocialIntent(apiKey: string, message: string): Promise<'social_image' | 'social_text' | 'not_social'> {
  try {
    const prompt = SOCIAL_STORIES_CLASSIFIER_PROMPT.replace('{MESSAGE}', message);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CLASSIFIER_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 10, temperature: 0.1 },
      }),
    });

    if (!response.ok) {
      console.error('Social classifier error:', response.status);
      return 'not_social';
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();
    if (result?.includes('SOCIAL_IMAGE')) return 'social_image';
    if (result?.includes('SOCIAL_TEXT')) return 'social_text';
    if (result?.includes('NOT_SOCIAL')) return 'not_social';
    return 'not_social';
  } catch (e) {
    console.error('Social classifier error:', e);
    return 'not_social';
  }
}

function needsIntentClassification(message: string): boolean {
  return IMAGE_HINT_REGEX.test(message) || VIDEO_HINT_REGEX.test(message);
}

// shouldRunSafetyScan removed — safety now runs on ALL messages

function extractAiText(data: any): string {
  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const parts = candidate?.content?.parts;

  if (finishReason && finishReason !== 'STOP') {
    console.log(`⚠️ Gemini finishReason=${finishReason} (response may be truncated)`);
  }

  if (!Array.isArray(parts)) return '';

  const text = parts
    .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();

  return text;
}

function normalizeAssistantResponse(rawText: string): string {
  let text = (rawText || '').replace(/\u2014/g, '-').trim();
  if (!text) return "I'm here to help! 😊";

  if (!/[.!?…]$/.test(text)) {
    text = `${text}.`;
  }

  return text;
}

function isLikelyIncompleteResponse(text: string): boolean {
  const trimmed = (text || '').trim();
  if (!trimmed) return true;
  if (/[,:;\-]$/.test(trimmed)) return true;
  if (!/[.!?…]$/.test(trimmed)) return true;

  return /\b(and|or|but|because|so|if|when|while|with|for|to|from|about|that|which|who)[.!?…]$/i.test(trimmed);
}

async function finalizeAssistantResponse(apiKey: string, userMessage: string, rawText: string): Promise<string> {
  const normalized = normalizeAssistantResponse(rawText);
  if (!isLikelyIncompleteResponse(rawText)) return normalized;

  try {
    const completionPrompt = `You are finishing an unfinished child-safe assistant response.
Complete ONLY the unfinished ending with one short, natural sentence.
Do not restart the answer.
Do not greet.
Do not add a new topic.
Make the final sentence complete and natural.

User message: "${userMessage}"
Partial assistant response: "${rawText}"`;

    const completionData = await callGeminiText(apiKey, [
      { role: 'user', parts: [{ text: completionPrompt }] },
    ], {
      temperature: 0.2,
    });

    const completion = extractAiText(completionData).replace(/^[\s,.;:!?-]+/, '').trim();
    if (!completion) return normalized;

    const combined = `${rawText.trim()} ${completion}`.replace(/\s+/g, ' ').trim();
    return normalizeAssistantResponse(combined);
  } catch (completionError) {
    console.error('Response completion error:', completionError);
    return normalized;
  }
}

// Helper: call Gemini text generation
async function callGeminiText(apiKey: string, contents: any[], generationConfig?: any): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${apiKey}`;
  const body: any = { contents };
  if (generationConfig) body.generationConfig = generationConfig;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini text API error:`, response.status, errorText);
    if (response.status === 429) throw new Error('RATE_LIMITED');
    throw new Error(`Gemini API error: ${response.status}`);
  }

  return response.json();
}

// Generate image using Gemini image model
async function generateImage(apiKey: string, prompt: string): Promise<{ imageBase64: string; mimeType: string } | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image gen error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts) return null;

    for (const part of parts) {
      if (part.inlineData) {
        return { imageBase64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' };
      }
    }
    return null;
  } catch (e) {
    console.error('Image generation error:', e);
    return null;
  }
}

// Video generation removed — feature disabled for all Free and Pro users.
// Only planned for Enterprise users via Contact Us flow.

// Get external Supabase client for DB operations (anon key, respects RLS)
function getExternalSupabase() {
  const url = Deno.env.get('EXTERNAL_SUPABASE_URL');
  const key = Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  return createClient(url, key);
}

// Get external Supabase client with service role (bypasses RLS - for abuse detection & usage)
function getExternalSupabaseAdmin() {
  const url = Deno.env.get('EXTERNAL_SUPABASE_URL');
  const key = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    console.error('Missing EXTERNAL_SUPABASE_URL or EXTERNAL_SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }
  return createClient(url, key);
}

// ====== USAGE QUOTA CHECKING (images only — video disabled) ======
interface UsageQuota {
  allowed: boolean;
  reason?: string;
  plan: string;
  imagesUsed: number;
  imagesLimit: number;
}

async function checkUsageQuota(userId: string): Promise<UsageQuota> {
  const extDb = getExternalSupabaseAdmin();
  if (!extDb) return { allowed: true, plan: 'unknown', imagesUsed: 0, imagesLimit: 999 };

  const now = new Date();
  const monthYear = now.toISOString().slice(0, 7);

  const { data: sub } = await extDb
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('expires_at', now.toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .single();

  const plan = sub ? 'pro' : 'free';
  const imagesLimit = plan === 'pro' ? 100 : 20;

  const { data: usage } = await extDb
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .single();

  const imagesUsed = usage?.images_generated || 0;

  if (imagesUsed >= imagesLimit) {
    return { allowed: false, reason: 'image_limit', plan, imagesUsed, imagesLimit };
  }

  return { allowed: true, plan, imagesUsed, imagesLimit };
}

async function incrementImageUsage(userId: string) {
  const extDb = getExternalSupabaseAdmin();
  if (!extDb) return;

  const monthYear = new Date().toISOString().slice(0, 7);

  const { data: existing } = await extDb
    .from('user_usage')
    .select('id, images_generated')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .single();

  if (existing) {
    await extDb.from('user_usage').update({
      images_generated: (existing.images_generated || 0) + 1,
    }).eq('id', existing.id);
  } else {
    await extDb.from('user_usage').insert({
      user_id: userId,
      month_year: monthYear,
      images_generated: 1,
      videos_generated: 0,
    });
  }
}

function buildImageQuotaExceededResponse(quota: UsageQuota) {
  return {
    response: `🖼️ **Image credits exhausted!** 😔\n\nYou've used **${quota.imagesUsed}/${quota.imagesLimit}** images this month.\n\nYour image credits will **renew on the 1st of next month**. 📅\n\n${quota.plan === 'free' ? '💡 **Tip:** Upgrade to **Pro** for 100 images/month! Go to your **🛡️ Account Dashboard** to upgrade.' : 'Your credits will reset soon. Thank you for being a Pro member! 🌟'}`,
    imageGenerated: false,
    quotaExceeded: true,
    quotaType: 'image',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Healthz endpoint
  const url = new URL(req.url);
  if (url.searchParams.get('healthz') === 'true') {
    return new Response(JSON.stringify({ status: 'ok', function: 'chat', timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ====== REQUEST SIZE LIMIT (10MB max) ======
    const contentLength = parseInt(req.headers.get('content-length') || '0');
    if (contentLength > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Request too large' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, conversationHistory, role, sessionToken, userId, userEmail, socialStoriesMode, character, userName, userNickname, forcedMode } = await req.json();

    // ====== INPUT SANITIZATION ======
    const sanitized = sanitizeUserInput(message);
    if (!sanitized.safe) {
      if (sanitized.blockedReason === 'prompt_injection') {
        return new Response(JSON.stringify({
          response: "Let's talk about something fun and educational instead! 🌟 What would you like to learn about? 😊",
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Please type a message to get started! 😊' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanMessage = sanitized.sanitizedMessage;
    const cleanHistory = sanitizeConversationHistory(conversationHistory);

    // Validate userId format if provided (must be UUID)
    if (userId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

    // ====== SOCIAL STORIES CLASSIFICATION (special mode) ======
    if (forcedMode === 'social_classify') {
      const socialIntent = await classifySocialIntent(GEMINI_API_KEY, cleanMessage);
      return new Response(JSON.stringify({ socialIntent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ====== SMART INTENT CLASSIFICATION ======
    // Fast path: skip classifier for obvious text chats to reduce latency.
    let detectedIntent: 'text' | 'image' | 'video' = 'text';

    if (socialStoriesMode) {
      // Social stories always generate images
      detectedIntent = 'image';
    } else if (forcedMode) {
      // User selected a forced mode - verify with AI
      detectedIntent = await classifyIntent(GEMINI_API_KEY, cleanMessage, forcedMode);
      console.log(`Intent classification: forcedMode=${forcedMode}, detected=${detectedIntent}`);
    } else if (needsIntentClassification(cleanMessage)) {
      detectedIntent = await classifyIntent(GEMINI_API_KEY, cleanMessage, null);
      console.log(`Intent classification: auto-detect=${detectedIntent}`);
    } else {
      detectedIntent = 'text';
      console.log('Intent classification: heuristic=text');
    }

    const isImageReq = detectedIntent === 'image';
    const isVideoReq = detectedIntent === 'video';

    // ====== VIDEO REQUESTS — feature disabled for Free + Pro ======
    // Always block; respond with "not available, contact us for Enterprise" message.
    if (isVideoReq) {
      return new Response(JSON.stringify({
        response: VIDEO_NOT_AVAILABLE_MESSAGE,
        videoGenerated: false,
        videoNotAvailable: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ====== IMAGE QUOTA CHECK ======
    if (userId && (isImageReq || socialStoriesMode)) {
      const quota = await checkUsageQuota(userId);
      if (!quota.allowed) {
        return new Response(JSON.stringify(buildImageQuotaExceededResponse(quota)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Social Stories mode - always generate image
    if (socialStoriesMode) {
      try {
        const imagePrompt = createSocialStoryPrompt(cleanMessage);
        const imageResult = await generateImage(GEMINI_API_KEY, imagePrompt);

        if (imageResult) {
          const textResponse = `📚 **Here's your social story about "${cleanMessage}"!** ✨\n\nI created a 6-panel comic to help you understand this situation better! 😊\n\nEach panel shows you what to do, step by step. You can look at the pictures and read the words under each one.\n\n**Would you like another social story?** Just tell me what situation you want to learn about! 🌟`;

          if (userId) {
            try {
              const extDb = getExternalSupabaseAdmin();
              if (extDb) {
                await extDb.from('generated_images').insert({
                  user_id: userId, prompt: cleanMessage, mode: 'social_stories',
                  image_data: imageResult.imageBase64, mime_type: imageResult.mimeType,
                });
                await extDb.from('chat_history').insert([
                  { user_id: userId, role: 'user', message_text: cleanMessage, mode: 'social_stories' },
                  { user_id: userId, role: 'assistant', message_text: textResponse, mode: 'social_stories' },
                ]);
              }
              await incrementImageUsage(userId);
            } catch (e) { console.error('DB save error:', e); }
          }

          return new Response(JSON.stringify({
            response: textResponse,
            imageGenerated: true,
            imageData: imageResult.imageBase64,
            mimeType: imageResult.mimeType,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({
          response: `📚 **I could not render the social story image this time.** 😔\n\nPlease try again, and I will sketch it again for you.`,
          imageGenerated: false,
          generationFailed: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (imgError) {
        console.error('Social story image error:', imgError);
        return new Response(JSON.stringify({
          response: "⚠️ **Unable to connect to the server right now.** Please try again later. 😔",
          imageGenerated: false,
          generationFailed: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Regular image generation
    if (isImageReq) {
      try {
        const imagePrompt = createChildFriendlyPrompt(cleanMessage);
        const imageResult = await generateImage(GEMINI_API_KEY, imagePrompt);

        if (imageResult) {
          const textResponse = `🎨 **I created an image for you!** ✨\n\nI hope you like it! 😊 What do you think about the image? Would you like me to create another one or explain something about what's in the picture?`;

          if (userId) {
            try {
              const extDb = getExternalSupabaseAdmin();
              if (extDb) {
                await extDb.from('generated_images').insert({
                  user_id: userId, prompt: cleanMessage, mode: 'general',
                  image_data: imageResult.imageBase64, mime_type: imageResult.mimeType,
                });
                await extDb.from('chat_history').insert([
                  { user_id: userId, role: 'user', message_text: cleanMessage, mode: 'general' },
                  { user_id: userId, role: 'assistant', message_text: textResponse, mode: 'general' },
                ]);
              }
              await incrementImageUsage(userId);
            } catch (e) { console.error('DB save error:', e); }
          }

          return new Response(JSON.stringify({
            response: textResponse,
            imageGenerated: true,
            imageData: imageResult.imageBase64,
            mimeType: imageResult.mimeType,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Image generation failed - return error
        return new Response(JSON.stringify({
          response: "⚠️ **Unable to generate the image right now.** Please try again later. 😔",
          imageGenerated: false,
          generationFailed: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (imgError) {
        console.error('Image generation error:', imgError);
        return new Response(JSON.stringify({
          response: "⚠️ **Unable to connect to the server right now.** Please try again later. 😔",
          imageGenerated: false,
          generationFailed: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Video generation removed — video requests handled earlier with VIDEO_NOT_AVAILABLE_MESSAGE.

    // ====== STEP 1: run abuse detection FIRST and AWAIT it ======
    // This is required so medium/high/critical messages get a tailored
    // empathetic response (and are logged to safety_alerts) instead of a
    // generic chat reply.
    const extDbForAbuse = getExternalSupabaseAdmin();
    let abuseResult: Awaited<ReturnType<typeof runAbuseDetection>> = null;
    try {
      if (extDbForAbuse) {
        abuseResult = await runAbuseDetection(GEMINI_API_KEY, extDbForAbuse, userId, userEmail, cleanMessage);
      }
    } catch (e) {
      console.error('Abuse detection error:', e);
    }

    const charName = character === 'milo' ? 'Milo' : 'Leo';
    const charEmoji = character === 'milo' ? '🐭' : '🐱';
    const displayName = userNickname || userName || 'friend';

    // ====== STEP 2: if flagged (medium/high/critical), generate a TAILORED empathetic reply ======
    if (abuseResult && abuseResult.isConcerning && ['medium', 'high', 'critical'].includes(abuseResult.severityLevel)) {
      console.log(`💙 Generating empathetic response for severity=${abuseResult.severityLevel}, category=${abuseResult.category}`);

      const empathyPrompt = buildAbuseResponsePrompt({
        message: cleanMessage,
        severity: abuseResult.severityLevel as 'critical' | 'high' | 'medium' | 'low',
        category: abuseResult.category,
        userName: displayName,
        charName,
        charEmoji,
      });

      let empathyText = '';
      try {
        const empathyData = await callGeminiText(
          GEMINI_API_KEY,
          [{ role: 'user', parts: [{ text: empathyPrompt }] }],
          { temperature: 0.6 },
        );
        empathyText = extractAiText(empathyData);
      } catch (e) {
        console.error('Empathy generation error:', e);
      }

      const finalEmpathy = await finalizeAssistantResponse(GEMINI_API_KEY, cleanMessage, empathyText)
        || `I hear you, ${displayName}. 💙\n\nWhat you shared matters, and I am so glad you told me. It is **not your fault**. Please talk to a trusted adult - a parent, teacher, or school counsellor - as soon as you can. They can help you feel safe.\n\nYou are brave, and you are not alone. ❤️`;

      // Save chat
      if (userId && extDbForAbuse) {
        try {
          await extDbForAbuse.from('chat_history').insert([
            { user_id: userId, role: 'user', message_text: cleanMessage, mode: 'general' },
            { user_id: userId, role: 'assistant', message_text: finalEmpathy, mode: 'general' },
          ]);
        } catch (dbError) {
          console.error('DB save error:', dbError);
        }
      }

      return new Response(JSON.stringify({ response: finalEmpathy }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ====== STEP 3: regular text chat using Gemini generateContent API ======
    const dynamicPrompt = buildSystemPrompt(character, userName, userNickname);
    const isFirstTurn = cleanHistory.length === 0;
    const runtimeInstruction = isFirstTurn
      ? 'This is the first assistant reply in this conversation. A short greeting is okay once.'
      : 'This is not the first reply. Do not greet with "hello/hi" and do not repeat the user name unless truly needed.';

    const historyParts = cleanHistory.slice(-6).map((h: any) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    const contents = [
      { role: 'user', parts: [{ text: `${dynamicPrompt}\n\n${runtimeInstruction}` }] },
      { role: 'model', parts: [{ text: 'Understood! I will follow all the rules above and stay in character and always use proper Markdown formatting with blank lines between paragraphs and bullet lists where helpful.' }] },
      ...historyParts,
      { role: 'user', parts: [{ text: cleanMessage }] },
    ];

    const data = await callGeminiText(GEMINI_API_KEY, contents, {
      temperature: 0.45,
    });

    const aiResponse = await finalizeAssistantResponse(GEMINI_API_KEY, cleanMessage, extractAiText(data));

    // Save chat to external database
    if (userId) {
      try {
        const extDb = getExternalSupabaseAdmin();
        if (extDb) {
          await extDb.from('chat_history').insert([
            { user_id: userId, role: 'user', message_text: cleanMessage, mode: 'general' },
            { user_id: userId, role: 'assistant', message_text: aiResponse, mode: 'general' },
          ]);
        }
      } catch (dbError) {
        console.error('DB save error:', dbError);
      }
    }

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat error:', error);
    if (error.message === 'RATE_LIMITED') {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment and try again! 😊' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: '⚠️ Unable to connect to the server right now. Please try again later. 😔' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
