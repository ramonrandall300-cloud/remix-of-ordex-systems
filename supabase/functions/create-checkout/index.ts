import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Per-seat price IDs keyed by base plan price ID */
const SEAT_PRICE_MAP: Record<string, string> = {
  "price_1TIMg6B2XJSLlpZr51kZn4Fm": "price_1TJa7EB2XJSLlpZrSjVfQhbf",  // Starter → $15/seat
  "price_1TIMgrB2XJSLlpZrlNVkCAQI": "price_1TJa9IB2XJSLlpZrBGhiwfD3",  // Professional → $25/seat
  "price_1TIMhSB2XJSLlpZrakAOOWgi": "price_1TJaDNB2XJSLlpZrTMhlrj4e",  // Elite → $35/seat
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { orgId, priceId, creditsAmount, seatCount } = await req.json();
    if (!orgId || !priceId) throw new Error("orgId and priceId are required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-06-20",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { org_id: orgId, user_id: user.id },
      });
      customerId = customer.id;
    }

    const origin = req.headers.get("origin") || "https://localhost:3000";

    // Build line items: base plan + per-seat add-on
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ];

    const seatPriceId = SEAT_PRICE_MAP[priceId];
    const seats = typeof seatCount === "number" && seatCount > 0 ? seatCount : 1;
    if (seatPriceId) {
      lineItems.push({ price: seatPriceId, quantity: seats });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: {
        org_id: orgId,
        user_id: user.id,
        credits_amount: String(creditsAmount || 0),
        seat_count: String(seats),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[create-checkout] ERROR:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
