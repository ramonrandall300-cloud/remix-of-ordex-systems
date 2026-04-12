import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Product → tier (must match check-subscription / invite-user) */
const PRODUCT_TIERS: Record<string, string> = {
  prod_UGuVgbRHstr711: "starter",
  prod_UGuV9iaW3l9RXI: "professional",
  prod_UGuWkOD0CWsOQ6: "elite",
};

/** Max organizations per tier */
const TIER_ORG_LIMITS: Record<string, number> = {
  free: 1,
  starter: 2,
  professional: 5,
  elite: 10,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the calling user
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !userData.user) throw new Error("Unauthorized");
    const userId = userData.user.id;
    const userEmail = userData.user.email;

    // Parse request
    const { name } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Organization name is required");
    }
    if (name.length > 255) throw new Error("Organization name too long");

    // Use service role for privileged operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Org limit enforcement ───
    // Count how many orgs the user currently owns
    const { count: currentOrgCount } = await adminClient
      .from("org_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const ownedOrgs = currentOrgCount ?? 0;

    // Determine user's subscription tier via Stripe
    let tier = "free";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey && userEmail) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        const subs = await stripe.subscriptions.list({
          customer: customers.data[0].id,
          status: "active",
          limit: 1,
        });
        if (subs.data.length > 0) {
          const productId = subs.data[0].items.data[0].price.product as string;
          tier = PRODUCT_TIERS[productId] || "free";
        }
      }
    }

    const orgLimit = TIER_ORG_LIMITS[tier] ?? 1;
    if (ownedOrgs >= orgLimit) {
      throw new Error(
        `Organization limit reached (${orgLimit} for ${tier} plan). Upgrade your plan to create more organizations.`
      );
    }

    // 1. Create the organization
    const { data: org, error: orgErr } = await adminClient
      .from("organizations")
      .insert({ name: name.trim() })
      .select("id")
      .single();
    if (orgErr) throw new Error(`Failed to create organization: ${orgErr.message}`);

    const orgId = org.id;
    console.log(`[CREATE-ORG] Created org ${orgId} for user ${userId} (tier=${tier}, ${ownedOrgs + 1}/${orgLimit})`);

    // 2. Add creator as owner
    const { error: memberErr } = await adminClient
      .from("org_members")
      .insert({ org_id: orgId, user_id: userId, role: "owner" });
    if (memberErr) throw new Error(`Failed to add owner: ${memberErr.message}`);

    // 3. Initialize org_credits with starter balance (500 credits for new orgs)
    const { error: creditsErr } = await adminClient
      .from("org_credits")
      .insert({ org_id: orgId, balance: 500 });
    if (creditsErr) throw new Error(`Failed to initialize credits: ${creditsErr.message}`);

    console.log(`[CREATE-ORG] Org ${orgId} fully initialized`);

    return new Response(
      JSON.stringify({ id: orgId, name: name.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[CREATE-ORG] Error: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
