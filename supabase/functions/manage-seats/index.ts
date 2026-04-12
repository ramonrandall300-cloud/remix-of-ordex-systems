import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Per-seat product IDs */
const SEAT_PRODUCTS = new Set([
  "prod_UIASeqjy4QL1IZ",  // Starter seat
  "prod_UIAU1eehHXxw4a",  // Professional seat
  "prod_UIAYtq9uBqKBlC",  // Elite seat
]);

/** Per-seat price IDs keyed by tier */
const TIER_SEAT_PRICES: Record<string, string> = {
  starter: "price_1TJa7EB2XJSLlpZrSjVfQhbf",
  professional: "price_1TJa9IB2XJSLlpZrBGhiwfD3",
  elite: "price_1TJaDNB2XJSLlpZrTMhlrj4e",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.email) throw new Error("Unauthorized");

    const user = userData.user;
    const { orgId, newSeatCount } = await req.json();
    if (!orgId || typeof newSeatCount !== "number" || newSeatCount < 1) {
      throw new Error("orgId and newSeatCount (≥1) are required");
    }

    // Verify caller is admin
    const { data: callerMember } = await supabaseClient
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!callerMember || !["admin", "owner"].includes(callerMember.role)) {
      throw new Error("Only admins can manage seats");
    }

    // Verify seat count >= current members
    const { count: memberCount } = await supabaseClient
      .from("org_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    if (newSeatCount < (memberCount ?? 0)) {
      throw new Error(`Cannot reduce below current member count (${memberCount}). Remove members first.`);
    }

    // Get current seat count before change
    const { data: subCacheBefore } = await supabaseClient
      .from("subscription_cache")
      .select("seat_count, tier")
      .eq("org_id", orgId)
      .maybeSingle();

    const previousSeatCount = subCacheBefore?.seat_count ?? 0;

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Find customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (customers.data.length === 0) throw new Error("No billing account found");

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) throw new Error("No active subscription");

    const subscription = subscriptions.data[0];

    // Find the seat line item
    let seatItem = subscription.items.data.find(
      (item) => SEAT_PRODUCTS.has(item.price.product as string)
    );

    if (seatItem) {
      // Update quantity
      await stripe.subscriptions.update(subscription.id, {
        items: [{ id: seatItem.id, quantity: newSeatCount }],
        proration_behavior: "create_prorations",
      });
    } else {
      // Determine tier from subscription cache
      const tier = subCacheBefore?.tier;
      if (!tier || !TIER_SEAT_PRICES[tier]) {
        throw new Error("Could not determine plan tier for seat pricing");
      }

      // Add seat line item
      await stripe.subscriptions.update(subscription.id, {
        items: [{ price: TIER_SEAT_PRICES[tier], quantity: newSeatCount }],
        proration_behavior: "create_prorations",
      });
    }

    // Update cache
    await supabaseClient.rpc("upsert_subscription_cache", {
      _org_id: orgId,
      _tier: null, // will be refreshed by check-subscription
      _seat_count: newSeatCount,
      _seat_price: seatItem?.price.unit_amount ?? 0,
      _subscription_id: subscription.id,
      _subscription_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    });

    console.log(`[MANAGE-SEATS] Updated seats to ${newSeatCount} for org ${orgId}`);

    // Send email notifications to all org admins
    const action = newSeatCount > previousSeatCount ? "added" : "removed";
    const { data: orgData } = await supabaseClient
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();

    const { data: adminMembers } = await supabaseClient
      .rpc("get_org_members_with_profile", { _org_id: orgId });

    const admins = (adminMembers ?? []).filter(
      (m: any) => m.role === "admin" || m.role === "owner"
    );

    for (const admin of admins) {
      try {
        await supabaseClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "seat-change",
            recipientEmail: admin.email,
            idempotencyKey: `seat-change-${orgId}-${newSeatCount}-${Date.now()}-${admin.user_id}`,
            templateData: {
              orgName: orgData?.name ?? "your organization",
              previousCount: previousSeatCount,
              newCount: newSeatCount,
              changedBy: user.email,
              action,
            },
          },
        });
      } catch (emailErr) {
        console.error(`[MANAGE-SEATS] Failed to send email to ${admin.email}:`, emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, seatCount: newSeatCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[MANAGE-SEATS] Error: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
