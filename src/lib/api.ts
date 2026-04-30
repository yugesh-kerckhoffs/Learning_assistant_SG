// ==========================================
// API helper — works with YOUR OWN Supabase project
// ==========================================
// When self-hosting, set these env vars:
//   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
//   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

const getBaseUrl = () => {
  // Use VITE_SUPABASE_URL which points to your own Supabase project
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) return `${supabaseUrl}/functions/v1`;
  // Fallback: construct from project ID
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (projectId) return `https://${projectId}.supabase.co/functions/v1`;
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PROJECT_ID');
};

const getAuthHeader = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
});

export async function apiChat(message: string, conversationHistory: any[], role: string | null, sessionToken: string | null, userId: string | null, userEmail: string | null, socialStoriesMode: boolean = false, character: string | null = null, userName: string | null = null, userNickname: string | null = null, forcedMode: string | null = null) {
  const response = await fetch(`${getBaseUrl()}/chat`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ message, conversationHistory, role, sessionToken, userId, userEmail, socialStoriesMode, character, userName, userNickname, forcedMode }),
  });
  return response.json();
}

export async function apiVerifyAdmin(secretKey: string) {
  const response = await fetch(`${getBaseUrl()}/verify-admin`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ secretKey }),
  });
  return response.json();
}

export async function apiVerifySession(role: string, sessionToken: string) {
  const response = await fetch(`${getBaseUrl()}/verify-session`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ role, sessionToken }),
  });
  return response.json();
}

export async function apiContact(name: string, email: string, message: string) {
  const response = await fetch(`${getBaseUrl()}/contact`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ name, email, message }),
  });
  return response.json();
}

export async function apiCheckEmailExists(email: string) {
  const response = await fetch(`${getBaseUrl()}/check-email-exists`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ email }),
  });
  return response.json();
}

export async function apiToggleMaintenance(secretKey: string, enabled: boolean) {
  const response = await fetch(`${getBaseUrl()}/toggle-maintenance`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ secretKey, enabled }),
  });
  return response.json();
}

export async function apiCheckQuota(type: 'image' | 'video'): Promise<{ allowed: boolean; reason?: string; plan?: string; imagesUsed?: number; imagesLimit?: number }> {
  // Video generation is disabled for Free + Pro users — handled in UI with "not available" message.
  if (type === 'video') {
    return { allowed: false, reason: 'video_disabled' };
  }
  try {
    const { externalSupabase } = await import('@/lib/externalSupabase');
    const { data: { session } } = await externalSupabase.auth.getSession();
    if (!session) return { allowed: true };

    const res = await fetch(`${getBaseUrl()}/check-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });
    const data = await res.json();
    if (data.error) return { allowed: true };

    const plan = data.plan || 'free';
    const imagesUsed = data.images_generated || 0;
    const imagesLimit = data.images_limit || 20;

    if (imagesUsed >= imagesLimit) {
      return { allowed: false, reason: 'image_limit', plan, imagesUsed, imagesLimit };
    }
    return { allowed: true, plan, imagesUsed, imagesLimit };
  } catch {
    return { allowed: true };
  }
}

export async function apiCheckMaintenance(): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(
      `${supabaseUrl}/rest/v1/app_settings?key=eq.maintenance_mode&select=value`,
      { headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } }
    );
    const data = await res.json();
    return data?.[0]?.value === true;
  } catch {
    return false;
  }
}
