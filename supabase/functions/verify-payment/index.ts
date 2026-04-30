import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (url.searchParams.get('healthz') === 'true') {
    return new Response(JSON.stringify({ status: 'ok', function: 'verify-payment', timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

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
    logStep("User authenticated", { userId: user.id });

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    logStep("Session retrieved", { status: session.payment_status, metadata: session.metadata });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, error: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify this session belongs to this user
    if (session.metadata?.user_id !== user.id) {
      throw new Error("Session does not belong to this user");
    }

    const months = parseInt(session.metadata?.months || "1");
    const now = new Date();
    
    // Check if user has existing active subscription - extend from expiry
    const { data: existingSub } = await externalSupabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', now.toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    const startDate = existingSub ? new Date(existingSub.expires_at) : now;
    const expiresAt = new Date(startDate);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    logStep("Updating subscription", { userId: user.id, months, expiresAt: expiresAt.toISOString() });

    // Deactivate old subscriptions
    await externalSupabase
      .from('user_subscriptions')
      .update({ is_active: false })
      .eq('user_id', user.id);

    // Create new subscription record
    const { error: insertError } = await externalSupabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        plan: 'pro',
        months_purchased: months,
        amount_paid: session.amount_total ? session.amount_total / 100 : (months === 12 ? 220 : months * 20),
        stripe_session_id: session_id,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      });

    if (insertError) {
      logStep("Insert error", { error: insertError });
      throw new Error("Failed to update subscription: " + insertError.message);
    }

    // Update profile plan
    await externalSupabase
      .from('profiles')
      .update({ plan: 'pro' })
      .eq('id', user.id);

    logStep("Subscription activated successfully");

    // Send receipt email via Stripe
    try {
      if (session.payment_intent && typeof session.payment_intent === 'string') {
        await stripe.paymentIntents.update(session.payment_intent, {
          receipt_email: session.metadata?.user_email || user.email,
        });
        logStep("Receipt email ensured on payment intent", { email: user.email });
      }
    } catch (receiptError) {
      logStep("Receipt email update non-fatal error", { error: String(receiptError) });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      plan: 'pro',
      expires_at: expiresAt.toISOString(),
      months,
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
