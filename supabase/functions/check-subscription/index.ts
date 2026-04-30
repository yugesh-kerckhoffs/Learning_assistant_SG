import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (url.searchParams.get('healthz') === 'true') {
    return new Response(JSON.stringify({ status: 'ok', function: 'check-subscription', timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep("Function started");

    const extUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const extServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
    const extAnonKey = Deno.env.get("EXTERNAL_SUPABASE_ANON_KEY");
    if (!extUrl || !extServiceKey) throw new Error("External Supabase config missing");

    const externalSupabase = createClient(extUrl, extServiceKey, { auth: { persistSession: false } });
    const anonClient = createClient(extUrl, extAnonKey || extServiceKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const user = userData.user;
    const now = new Date().toISOString();

    // Check active subscription
    const { data: sub } = await externalSupabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    // If subscription expired, demote to free
    if (!sub) {
      // Check if there's an expired active sub to deactivate
      const { data: expiredSubs } = await externalSupabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .lte('expires_at', now);

      if (expiredSubs && expiredSubs.length > 0) {
        await externalSupabase
          .from('user_subscriptions')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('is_active', true)
          .lte('expires_at', now);

        await externalSupabase
          .from('profiles')
          .update({ plan: 'free' })
          .eq('id', user.id);

        logStep("Expired subscriptions deactivated");
      }
    }

    // Get usage for current month
    const monthYear = new Date().toISOString().slice(0, 7); // '2026-03'
    const { data: usage } = await externalSupabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_year', monthYear)
      .single();

    const plan = sub ? 'pro' : 'free';
    const imagesLimit = plan === 'pro' ? 100 : 20;
    const videosLimit = 0; // Video generation disabled for Free + Pro users (Enterprise-only feature, not yet implemented)

    logStep("Subscription check complete", { plan, sub: !!sub });

    return new Response(JSON.stringify({
      plan,
      is_pro: !!sub,
      expires_at: sub?.expires_at || null,
      months_purchased: sub?.months_purchased || null,
      amount_paid: sub?.amount_paid || null,
      images_generated: usage?.images_generated || 0,
      videos_generated: usage?.videos_generated || 0,
      images_limit: imagesLimit,
      videos_limit: videosLimit,
      month_year: monthYear,
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
