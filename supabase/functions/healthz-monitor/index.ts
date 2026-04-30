import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FUNCTIONS_TO_CHECK = [
  'chat',
  'check-subscription',
  'create-checkout',
  'verify-payment',
  'speech-to-text',
  'contact',
  'toggle-maintenance',
  'verify-admin',
  'verify-session',
  'check-email-exists',
];

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[HEALTHZ-MONITOR] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Own healthz
  const url = new URL(req.url);
  if (url.searchParams.get('healthz') === 'true') {
    return new Response(JSON.stringify({ status: 'ok', function: 'healthz-monitor', timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep("Health check started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const extUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const extServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");

    if (!extUrl || !extServiceKey) {
      throw new Error("External Supabase config missing");
    }

    const extDb = createClient(extUrl, extServiceKey, { auth: { persistSession: false } });
    const baseUrl = `${supabaseUrl}/functions/v1`;
    const results: { function_name: string; status: string; response_time_ms: number; error_message: string | null }[] = [];

    // Check each function's healthz endpoint
    for (const fnName of FUNCTIONS_TO_CHECK) {
      const start = Date.now();
      try {
        const res = await fetch(`${baseUrl}/${fnName}?healthz=true`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          signal: AbortSignal.timeout(10000),
        });

        const elapsed = Date.now() - start;

        if (res.ok) {
          const data = await res.json();
          results.push({
            function_name: fnName,
            status: 'healthy',
            response_time_ms: elapsed,
            error_message: null,
          });
        } else {
          const errorText = await res.text().catch(() => 'Unknown error');
          results.push({
            function_name: fnName,
            status: 'error',
            response_time_ms: elapsed,
            error_message: `HTTP ${res.status}: ${errorText.substring(0, 200)}`,
          });
        }
      } catch (e) {
        const elapsed = Date.now() - start;
        results.push({
          function_name: fnName,
          status: 'unreachable',
          response_time_ms: elapsed,
          error_message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Also check Gemini API health (lightweight)
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiKey) {
      const start = Date.now();
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
          { signal: AbortSignal.timeout(10000) }
        );
        const elapsed = Date.now() - start;
        results.push({
          function_name: 'gemini-api',
          status: res.ok ? 'healthy' : 'error',
          response_time_ms: elapsed,
          error_message: res.ok ? null : `HTTP ${res.status}`,
        });
      } catch (e) {
        results.push({
          function_name: 'gemini-api',
          status: 'unreachable',
          response_time_ms: Date.now() - start,
          error_message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Check Stripe API health
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const start = Date.now();
      try {
        const res = await fetch('https://api.stripe.com/v1/balance', {
          headers: { 'Authorization': `Bearer ${stripeKey}` },
          signal: AbortSignal.timeout(10000),
        });
        const elapsed = Date.now() - start;
        results.push({
          function_name: 'stripe-api',
          status: res.ok ? 'healthy' : 'error',
          response_time_ms: elapsed,
          error_message: res.ok ? null : `HTTP ${res.status}`,
        });
      } catch (e) {
        results.push({
          function_name: 'stripe-api',
          status: 'unreachable',
          response_time_ms: Date.now() - start,
          error_message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Check External Supabase DB health
    {
      const start = Date.now();
      try {
        const { error } = await extDb.from('profiles').select('id').limit(1);
        const elapsed = Date.now() - start;
        results.push({
          function_name: 'external-database',
          status: error ? 'error' : 'healthy',
          response_time_ms: elapsed,
          error_message: error ? error.message : null,
        });
      } catch (e) {
        results.push({
          function_name: 'external-database',
          status: 'unreachable',
          response_time_ms: Date.now() - start,
          error_message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Store results in external DB
    const now = new Date().toISOString();
    const allHealthy = results.every(r => r.status === 'healthy');
    const overallStatus = allHealthy ? 'all healthy' : `${results.filter(r => r.status !== 'healthy').length} issue(s)`;

    const logEntries = results.map(r => ({
      checked_at: now,
      function_name: r.function_name,
      status: r.status,
      response_time_ms: r.response_time_ms,
      error_message: r.error_message,
      overall_status: overallStatus,
    }));

    const { error: insertError } = await extDb.from('api_health_logs').insert(logEntries);
    if (insertError) {
      logStep("DB insert error", { error: insertError.message });
    }

    logStep("Health check complete", { overall: overallStatus, checked: results.length });

    return new Response(JSON.stringify({
      overall: overallStatus,
      checked_at: now,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
