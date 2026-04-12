import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

const PRODUCT_TIERS: Record<string, string> = {
  prod_UGuVgbRHstr711: "starter",
  prod_UGuV9iaW3l9RXI: "professional",
  prod_UGuWkOD0CWsOQ6: "elite",
};

const TIER_RETENTION_DAYS: Record<string, number> = {
  starter: 30,
  professional: 90,
  elite: 365,
};

/** Per-seat add-on product IDs */
const SEAT_PRODUCTS = new Set([
  "prod_UIASeqjy4QL1IZ",  // Starter seat
  "prod_UIAU1eehHXxw4a",  // Professional seat
  "prod_UIAYtq9uBqKBlC",  // Elite seat
]);

const UNSUBSCRIBED = JSON.stringify({
  subscribed: false, tier: null, subscription_end: null, product_id: null,
  subscription_id: null, seat_count: 0, seat_price: 0,
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(UNSUBSCRIBED, {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      logStep("Auth failed or no email", { error: userError?.message });
      return new Response(UNSUBSCRIBED, {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(UNSUBSCRIBED, {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription");
      return new Response(UNSUBSCRIBED, {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    let subscriptionEnd: string | null = null;
    try {
      const endTs = subscription.current_period_end;
      if (typeof endTs === "number" && endTs > 0) {
        subscriptionEnd = new Date(endTs * 1000).toISOString();
      }
    } catch {
      logStep("Could not parse subscription end date");
    }

    let tier = "unknown";
    let productId: string | null = null;
    let seatCount = 0;
    let seatPrice = 0;

    for (const item of subscription.items.data) {
      const prod = item.price.product as string;
      if (PRODUCT_TIERS[prod]) {
        tier = PRODUCT_TIERS[prod];
        productId = prod;
      } else if (SEAT_PRODUCTS.has(prod)) {
        seatCount = item.quantity ?? 0;
        seatPrice = item.price.unit_amount ?? 0;
      }
    }

    const retentionDays = TIER_RETENTION_DAYS[tier] ?? 7;

    logStep("Active subscription found", { subscriptionId: subscription.id, tier, subscriptionEnd, seatCount, seatPrice, retentionDays });

    // Sync subscription cache to DB
    try {
      const { data: orgRow } = await supabaseClient
        .from("organizations")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (orgRow) {
        await supabaseClient.rpc("upsert_subscription_cache", {
          _org_id: orgRow.id,
          _tier: tier === "unknown" ? null : tier,
          _seat_count: seatCount,
          _seat_price: seatPrice,
          _subscription_id: subscription.id,
          _subscription_end: subscriptionEnd,
          _retention_days: retentionDays,
        });
      }
    } catch (cacheErr) {
      logStep("Cache sync failed (non-fatal)", { error: String(cacheErr) });
    }

    return new Response(
      JSON.stringify({
        subscribed: true,
        tier,
        subscription_end: subscriptionEnd,
        product_id: productId,
        subscription_id: subscription.id,
        seat_count: seatCount,
        seat_price: seatPrice,
        retention_days: retentionDays,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
