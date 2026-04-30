import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function sanitizeText(input: string, maxLength: number): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/<[^>]*>/g, '');
}

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string' || email.length > 254) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (url.searchParams.get('healthz') === 'true') {
    return new Response(JSON.stringify({ status: 'ok', function: 'contact', timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Size limit
    const contentLength = parseInt(req.headers.get('content-length') || '0');
    if (contentLength > 50000) {
      return new Response(JSON.stringify({ error: 'Request too large' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const name = sanitizeText(body.name, 100);
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : '';
    const message = sanitizeText(body.message, 2000);

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store in external Supabase
    const extUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const extKey = Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY');
    if (extUrl && extKey) {
      const extSupabase = createClient(extUrl, extKey);
      const { error: dbError } = await extSupabase
        .from('contact_messages')
        .insert([{ name, email, message }]);
      if (dbError) {
        console.error('DB insert error:', dbError.message);
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Message received!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Contact error:', error);
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
