import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONTHLY_PRICE_ID = "price_1TRee400JAjKwCmJndKYOTKw";
const YEARLY_PRICE_ID = "price_1TReen00JAjKwCmJSToxCumQ";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (url.searchParams.get('healthz') === 'true') {
    return new Response(JSON.stringify({ status: 'ok', function: 'create-checkout', timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Use external Supabase for auth
    const extUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const extServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
    if (!extUrl || !extServiceKey) throw new Error("External Supabase config missing");

    const externalSupabase = createClient(extUrl, extServiceKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    // Get the anon key to verify user token against external Supabase
    const extAnonKey = Deno.env.get("EXTERNAL_SUPABASE_ANON_KEY");
    const anonClient = createClient(extUrl, extAnonKey || extServiceKey, { auth: { persistSession: false } });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("User not authenticated");

    const user = userData.user;
    logStep("User authenticated", { email: user.email });

    const { months } = await req.json();
    if (!months || months < 1 || months > 12 || !Number.isInteger(months)) {
      throw new Error("Invalid months: must be integer 1-12");
    }

    logStep("Months selected", { months });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Determine price and quantity
    let lineItems;
    if (months === 12) {
      // 12-month bundle: $220 (pay for 11)
      lineItems = [{ price: YEARLY_PRICE_ID, quantity: 1 }];
    } else {
      // 1-11 months: $20 each
      lineItems = [{ price: MONTHLY_PRICE_ID, quantity: months }];
    }

    const totalAmount = months === 12 ? 220 : months * 20;
    logStep("Creating checkout session", { lineItems, totalAmount });

    const origin = req.headers.get("origin") || "https://id-preview--1b12a866-2993-429b-9154-ec6c5558dd08.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/app/account?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/account?payment=cancelled`,
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata: {
            user_id: user.id,
            months: String(months),
          },
        },
      },
      metadata: {
        user_id: user.id,
        months: String(months),
        user_email: user.email,
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          months: String(months),
        },
      },
    });

    // Attempt to send receipt via payment intent
    try {
      if (session.payment_intent && typeof session.payment_intent === 'string') {
        await stripe.paymentIntents.update(session.payment_intent, {
          receipt_email: user.email,
        });
        logStep("Receipt email set on payment intent", { email: user.email });
      }
    } catch (receiptError) {
      logStep("Could not set receipt email on payment intent (non-fatal)", { error: String(receiptError) });
    }

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
