// ==========================================
// Abuse Detection Module
// Detects unsafe child-facing content and logs real safety alerts
// Runs on EVERY message with a rule engine + AI moderation
// ==========================================

import { ABUSE_ANALYSIS_PROMPT } from './prompts.ts';

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
type DetectionMethod = 'rule_match' | 'ai_analysis' | 'hybrid';

type SafetyCategory =
  | 'sexual_18_plus'
  | 'grooming_or_predator_behavior'
  | 'violence_or_abuse_disclosure'
  | 'self_harm_or_suicide'
  | 'drugs_or_illegal_activity'
  | 'dark_web_hacking_or_cybercrime'
  | 'bullying_or_harassment'
  | 'personal_information_sharing'
  | 'extremism_or_dangerous_groups'
  | 'other_unsafe_behavior'
  | 'safe';

interface DetectionRule {
  pattern: RegExp;
  severityLevel: SeverityLevel;
  category: Exclude<SafetyCategory, 'safe'>;
  issue: string;
}

export interface AbuseDetectionResult {
  isConcerning: boolean;
  shouldLog: boolean;
  severityLevel: SeverityLevel;
  detectionMethod: DetectionMethod;
  category: SafetyCategory;
  foundKeywords: string[];
  confidence?: number;
  extractedName?: string | null;
}

const CRITICAL_RULES: DetectionRule[] = [
  { pattern: /\b(show me porn|send (?:me )?(?:nudes?|nude pics?|private pics?)|sexual roleplay|sex chat|sex video|child porn|underage porn|cp)\b/i, severityLevel: 'critical', category: 'sexual_18_plus', issue: 'explicit sexual content request' },
  { pattern: /\b(don'?t tell (?:your )?(?:mom|dad|parents|teacher|anyone)|keep this secret|send me a photo of yourself|show me your body|let'?s move to (?:whatsapp|telegram|snapchat|discord)|private chat with me)\b/i, severityLevel: 'critical', category: 'grooming_or_predator_behavior', issue: 'grooming or secrecy pattern' },
  { pattern: /\b(kill myself|want to die|end my life|suicide|how to cut myself|cut myself|self-harm|self harm)\b/i, severityLevel: 'critical', category: 'self_harm_or_suicide', issue: 'self-harm or suicide risk' },
  { pattern: /\b(how to kill someone|how to stab someone|how to poison someone|how to buy (?:a )?(?:gun|guns|weapon|weapons).*(?:dark web|darkweb)|build a bomb|make an explosive)\b/i, severityLevel: 'critical', category: 'violence_or_abuse_disclosure', issue: 'severe violence request' },
  { pattern: /\b(terrorist|terrorism|join isis|extremist group|violent jihad)\b/i, severityLevel: 'critical', category: 'extremism_or_dangerous_groups', issue: 'extremist content' },
];

const HIGH_RULES: DetectionRule[] = [
  { pattern: /\b(?:my|our)\s+(?:teacher|dad|mom|father|mother|uncle|aunt|brother|sister|coach|babysitter|parent|parents)\s+(?:hit|hits|hurt|hurts|attacked|beat|beats|touched|molested|abused|threatened)\s+me\b/i, severityLevel: 'high', category: 'violence_or_abuse_disclosure', issue: 'abuse disclosure by child' },
  { pattern: /\b(attacked me|beat me|beats me|hit me|hurts me|touched me inappropriately|someone touched me|i am not safe at home)\b/i, severityLevel: 'high', category: 'violence_or_abuse_disclosure', issue: 'direct harm disclosure' },
  { pattern: /\b(how to buy cocaine|buy weed|buy meth|sell drugs|hack instagram|hack facebook|hack bank account|access the dark web|use tor browser to buy)\b/i, severityLevel: 'high', category: 'drugs_or_illegal_activity', issue: 'illegal or cybercrime request' },
  { pattern: /\b(my address is|my phone number is|my password is|my school is|my email is)\b/i, severityLevel: 'high', category: 'personal_information_sharing', issue: 'sharing sensitive personal information' },
  { pattern: /\b(how to have sex|masturbat|onlyfans|send sexy pics|show me naked people)\b/i, severityLevel: 'high', category: 'sexual_18_plus', issue: 'explicit 18+ request' },
  { pattern: /\b(i hate myself|nobody cares about me|nobody loves me)\b/i, severityLevel: 'high', category: 'self_harm_or_suicide', issue: 'serious emotional risk statement' },
];

const MEDIUM_RULES: DetectionRule[] = [
  { pattern: /\b(they bully me|they bullied me|they are bullying me|harassing me|makes fun of me|teases me|laughs at me)\b/i, severityLevel: 'medium', category: 'bullying_or_harassment', issue: 'bullying or harassment' },
  { pattern: /\b(you are stupid|idiot|dumb|shut up|hate you)\b/i, severityLevel: 'medium', category: 'bullying_or_harassment', issue: 'abusive language' },
  { pattern: /\b(bet money|gamble online|free robux scam|free vbucks scam|illegal download|torrent movie|pirated movie)\b/i, severityLevel: 'medium', category: 'other_unsafe_behavior', issue: 'unsafe scam, gambling, or piracy content' },
  { pattern: /\b(dangerous challenge|i dare you to hurt|run away from home)\b/i, severityLevel: 'medium', category: 'other_unsafe_behavior', issue: 'dangerous challenge or unsafe behavior' },
];

const SAFE_CONTEXT_PATTERNS = [
  /\bwhat is my name\b/i,
  /\bwhat is the dark web\b/i,
  /\bteacher told us about\b/i,
  /\bmy (?:science )?project is about\b/i,
  /\bfor school\b/i,
  /\bhomework\b/i,
  /\bessay\b/i,
  /\breport about\b/i,
  /\bi feel\b/i,
  /\bi am feeling\b/i,
  /\bi'?m feeling\b/i,
];

function highestSeverity(a: SeverityLevel, b: SeverityLevel): SeverityLevel {
  const order: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

function normalizeMessage(message: string): string {
  return message.toLowerCase().replace(/\s+/g, ' ').trim();
}

function findRuleMatches(message: string, rules: DetectionRule[]): DetectionRule[] {
  return rules.filter((rule) => rule.pattern.test(message));
}

function buildRuleResult(matches: DetectionRule[], detectionMethod: DetectionMethod = 'rule_match'): AbuseDetectionResult | null {
  if (!matches.length) return null;

  const severityLevel = matches.reduce<SeverityLevel>((current, item) => highestSeverity(current, item.severityLevel), 'low');
  const primary = matches.find((item) => item.severityLevel === severityLevel) || matches[0];

  return {
    isConcerning: true,
    shouldLog: true,
    severityLevel,
    detectionMethod,
    category: primary.category,
    foundKeywords: [...new Set(matches.map((item) => item.issue))],
    confidence: detectionMethod === 'rule_match' ? 0.98 : 0.9,
    extractedName: null,
  };
}

function isClearlySafeContext(message: string): boolean {
  return SAFE_CONTEXT_PATTERNS.some((pattern) => pattern.test(message));
}

export function detectAbuse(message: string): AbuseDetectionResult | null {
  const normalized = normalizeMessage(message);
  if (!normalized) return null;

  const criticalMatches = findRuleMatches(normalized, CRITICAL_RULES);
  if (criticalMatches.length) return buildRuleResult(criticalMatches);

  const highMatches = findRuleMatches(normalized, HIGH_RULES);
  if (highMatches.length) return buildRuleResult(highMatches);

  if (isClearlySafeContext(normalized)) return null;

  const mediumMatches = findRuleMatches(normalized, MEDIUM_RULES);
  return buildRuleResult(mediumMatches);
}

function parseAiJson(aiText: string): Record<string, any> | null {
  try {
    return JSON.parse(aiText);
  } catch {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
}

// ====== AI ANALYSIS (runs on every message for deep moderation) ======
export async function analyzeWithAI(apiKey: string, message: string): Promise<AbuseDetectionResult | null> {
  try {
    const analysisPrompt = ABUSE_ANALYSIS_PROMPT.replace('{MESSAGE}', message);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 220,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('AI abuse analysis HTTP error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) return null;

    const parsed = parseAiJson(aiText);
    if (!parsed || parsed.is_concerning !== true || parsed.should_log === false) {
      return null;
    }

    const severity = ['critical', 'high', 'medium', 'low'].includes(parsed.severity)
      ? parsed.severity
      : 'medium';

    const category: SafetyCategory = [
      'sexual_18_plus',
      'grooming_or_predator_behavior',
      'violence_or_abuse_disclosure',
      'self_harm_or_suicide',
      'drugs_or_illegal_activity',
      'dark_web_hacking_or_cybercrime',
      'bullying_or_harassment',
      'personal_information_sharing',
      'extremism_or_dangerous_groups',
      'other_unsafe_behavior',
      'safe',
    ].includes(parsed.category)
      ? parsed.category
      : 'other_unsafe_behavior';

    return {
      isConcerning: true,
      shouldLog: true,
      severityLevel: severity as SeverityLevel,
      detectionMethod: 'ai_analysis',
      category,
      foundKeywords: Array.isArray(parsed.detected_issues) && parsed.detected_issues.length
        ? parsed.detected_issues.map(String)
        : [String(parsed.reason || 'ai_flagged')],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.75,
      extractedName: typeof parsed.extracted_name === 'string' ? parsed.extracted_name : null,
    };
  } catch (e) {
    console.error('AI abuse analysis error:', e);
    return null;
  }
}

function mergeDetectionResults(ruleResult: AbuseDetectionResult, aiResult: AbuseDetectionResult): AbuseDetectionResult {
  return {
    isConcerning: true,
    shouldLog: true,
    severityLevel: highestSeverity(ruleResult.severityLevel, aiResult.severityLevel),
    detectionMethod: 'hybrid',
    category: aiResult.category !== 'safe' ? aiResult.category : ruleResult.category,
    foundKeywords: [...new Set([...ruleResult.foundKeywords, ...aiResult.foundKeywords])],
    confidence: Math.max(ruleResult.confidence || 0, aiResult.confidence || 0),
    extractedName: aiResult.extractedName || ruleResult.extractedName || null,
  };
}

// Collect all emails associated with a student
async function collectEmails(extDb: any, userEmail: string | null, userId: string | null): Promise<string[]> {
  const emails: string[] = [];
  if (userEmail) emails.push(userEmail);
  if (!extDb || !userId) return emails;

  try {
    const { data: profile } = await extDb
      .from('profiles')
      .select('school_id, assigned_teacher_id')
      .eq('id', userId)
      .single();

    if (!profile) return emails;

    if (profile.assigned_teacher_id) {
      const { data: teacher } = await extDb
        .from('teachers')
        .select('teacher_email')
        .eq('id', profile.assigned_teacher_id)
        .single();
      if (teacher?.teacher_email) emails.push(teacher.teacher_email);
    }

    if (profile.school_id) {
      const { data: school } = await extDb
        .from('schools')
        .select('principal_email, counselor_email')
        .eq('id', profile.school_id)
        .single();
      if (school?.principal_email) emails.push(school.principal_email);
      if (school?.counselor_email) emails.push(school.counselor_email);
    }
  } catch (e) {
    console.error('Error collecting emails:', e);
  }

  return [...new Set(emails)];
}

// Log safety alert to database
export async function logSafetyAlert(
  extDb: any,
  userId: string | null,
  userEmail: string | null,
  message: string,
  detectionResult: AbuseDetectionResult
): Promise<void> {
  if (!extDb) {
    console.error('No external DB connection for safety alert');
    return;
  }

  try {
    const emailsToNotify = await collectEmails(extDb, userEmail, userId);

    const { error } = await extDb.from('safety_alerts').insert({
      user_id: userId,
      flagged_message: message,
      detection_method: `${detectionResult.detectionMethod}:${detectionResult.category}`,
      severity_level: detectionResult.severityLevel,
      emails_to_notify: emailsToNotify,
    });

    if (error) {
      console.error('Safety alert insert error:', error);
    } else {
      console.log(`✅ Safety alert SAVED: severity=${detectionResult.severityLevel}, method=${detectionResult.detectionMethod}, category=${detectionResult.category}, issues=${JSON.stringify(detectionResult.foundKeywords)}`);
    }
  } catch (e) {
    console.error('Error logging safety alert:', e);
  }
}

// ====== MAIN PIPELINE: runs on EVERY user message ======
export async function runAbuseDetection(
  apiKey: string,
  extDb: any,
  userId: string | null,
  userEmail: string | null,
  message: string
): Promise<AbuseDetectionResult | null> {
  // Step 1: high-confidence rule engine
  const ruleResult = detectAbuse(message);

  if (ruleResult && ['critical', 'high'].includes(ruleResult.severityLevel)) {
    console.log(`🚨 Rule detection flagged: severity=${ruleResult.severityLevel}, category=${ruleResult.category}, issues=${JSON.stringify(ruleResult.foundKeywords)}`);
    await logSafetyAlert(extDb, userId, userEmail, message, ruleResult);
    return ruleResult;
  }

  // Step 2: AI analysis for every message to understand context safely
  const aiResult = await analyzeWithAI(apiKey, message);

  if (aiResult && aiResult.isConcerning) {
    const finalResult = ruleResult ? mergeDetectionResults(ruleResult, aiResult) : aiResult;
    console.log(`🚨 AI analysis flagged: severity=${finalResult.severityLevel}, category=${finalResult.category}, issues=${JSON.stringify(finalResult.foundKeywords)}`);
    await logSafetyAlert(extDb, userId, userEmail, message, finalResult);
    return finalResult;
  }

  if (ruleResult && ruleResult.isConcerning) {
    console.log(`🚨 Rule fallback flagged: severity=${ruleResult.severityLevel}, category=${ruleResult.category}, issues=${JSON.stringify(ruleResult.foundKeywords)}`);
    await logSafetyAlert(extDb, userId, userEmail, message, ruleResult);
    return ruleResult;
  }

  return null;
}
