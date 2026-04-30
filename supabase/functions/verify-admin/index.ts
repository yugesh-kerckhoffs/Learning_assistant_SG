const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Constant-time comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (url.searchParams.get('healthz') === 'true') {
    return new Response(JSON.stringify({ status: 'ok', function: 'verify-admin', timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const secretKey = typeof body.secretKey === 'string' ? body.secretKey.trim() : '';
    const adminKey = Deno.env.get('ADMIN_SECRET_KEY') || '';

    if (!secretKey || !adminKey) {
      // Add artificial delay to prevent brute-force timing
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      return new Response(JSON.stringify({ isAdmin: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isAdmin = secureCompare(secretKey, adminKey);

    // Add delay on failure to slow brute-force
    if (!isAdmin) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
    }

    return new Response(JSON.stringify({ isAdmin }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ isAdmin: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
