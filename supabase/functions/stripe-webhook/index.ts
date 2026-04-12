import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

/** Product → tier mapping */
const PRODUCT_TIERS: Record<string, string> = {
  prod_UGuVgbRHstr711: "starter",
  prod_UGuV9iaW3l9RXI: "professional",
  prod_UGuWkOD0CWsOQ6: "elite",
};

/** Per-seat add-on product IDs */
const SEAT_PRODUCTS = new Set([
  "prod_UIASeqjy4QL1IZ",  // Starter seat
  "prod_UIAU1eehHXxw4a",  // Professional seat
  "prod_UIAYtq9uBqKBlC",  // Elite seat
]);

/** Monthly credit top-up per tier */
const TIER_CREDITS: Record<string, number> = {
  starter: 500,
  professional: 2000,
  elite: 5000,
};

async function resolveOrgId(
  customerId: string | null,
  metadata?: Record<string, string>
): Promise<string | null> {
  if (metadata?.org_id) return metadata.org_id;
  if (customerId) {
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .eq("stripe_customer_id", String(customerId))
      .maybeSingle();
    if (data) return data.id;
  }
  return null;
}

function resolveCredits(metadata?: Record<string, string>, productId?: string): number {
  const explicit = parseInt(metadata?.credits_amount || "0", 10);
  if (explicit > 0) return explicit;
  if (productId) {
    const tier = PRODUCT_TIERS[productId];
    if (tier && TIER_CREDITS[tier]) return TIER_CREDITS[tier];
  }
  return 0;
}

async function syncSubscriptionCache(subscription: Stripe.Subscription, orgId: string) {
  let tier: string | null = null;
  let seatCount = 0;
  let seatPrice = 0;

  for (const item of subscription.items.data) {
    const prod = item.price.product as string;
    if (PRODUCT_TIERS[prod]) {
      tier = PRODUCT_TIERS[prod];
    } else if (SEAT_PRODUCTS.has(prod)) {
      seatCount = item.quantity ?? 0;
      seatPrice = item.price.unit_amount ?? 0;
    }
  }

  let subscriptionEnd: string | null = null;
  try {
    const endTs = subscription.current_period_end;
    if (typeof endTs === "number" && endTs > 0) {
      subscriptionEnd = new Date(endTs * 1000).toISOString();
    }
  } catch { /* ignore */ }

  await supabase.rpc("upsert_subscription_cache", {
    _org_id: orgId,
    _tier: tier,
    _seat_count: seatCount,
    _seat_price: seatPrice,
    _subscription_id: subscription.id,
    _subscription_end: subscriptionEnd,
  });

  console.log(`[STRIPE-WEBHOOK] Synced subscription cache for org ${orgId}: tier=${tier}, seats=${seatCount}`);
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret =
    Deno.env.get("STRIPE_SECRET_WEBHOOK") || Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.error("[STRIPE-WEBHOOK] Missing signature or webhook secret");
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[STRIPE-WEBHOOK] Signature verification failed: ${msg}`);
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  console.log(`[STRIPE-WEBHOOK] Event received: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = await resolveOrgId(
          session.customer as string | null,
          session.metadata as Record<string, string>
        );
        if (!orgId) {
          console.error("[STRIPE-WEBHOOK] Cannot resolve org_id for checkout session");
          return new Response("Cannot resolve org_id", { status: 400 });
        }

        const creditsAmount = parseInt(session.metadata?.credits_amount || "0", 10);
        if (creditsAmount <= 0) {
          console.log("[STRIPE-WEBHOOK] No credits to add (amount=0)");
          break;
        }

        const { data: newBalance, error: adjustErr } = await supabase.rpc("adjust_credits", {
          _org_id: orgId,
          _amount: creditsAmount,
        });
        if (adjustErr) throw new Error(`adjust_credits failed: ${adjustErr.message}`);
        console.log(`[STRIPE-WEBHOOK] Added ${creditsAmount} credits to org ${orgId}. New balance: ${newBalance}`);

        const userId = session.metadata?.user_id;
        if (userId) {
          await supabase.from("usage_logs").insert({
            org_id: orgId,
            user_id: userId,
            credits_used: -creditsAmount,
            description: `Purchased ${creditsAmount} credits via Stripe`,
          });
        }

        if (session.customer) {
          await supabase
            .from("organizations")
            .update({ stripe_customer_id: String(session.customer) })
            .eq("id", orgId);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | null;
        const orgId = await resolveOrgId(customerId, invoice.metadata as Record<string, string>);

        if (!orgId) {
          console.log("[STRIPE-WEBHOOK] invoice.paid — no org_id mapped, skipping");
          break;
        }

        const productId =
          (invoice.lines?.data?.[0]?.price?.product as string) || undefined;

        const creditsAmount = resolveCredits(
          { ...((invoice.metadata || {}) as Record<string, string>), ...((invoice.lines?.data?.[0]?.metadata || {}) as Record<string, string>) },
          productId
        );

        if (creditsAmount > 0) {
          const { data: newBalance, error } = await supabase.rpc("adjust_credits", {
            _org_id: orgId,
            _amount: creditsAmount,
          });
          if (error) throw new Error(`adjust_credits failed: ${error.message}`);
          console.log(`[STRIPE-WEBHOOK] invoice.paid — Added ${creditsAmount} credits to org ${orgId}. Balance: ${newBalance}`);

          const tier = productId ? PRODUCT_TIERS[productId] || "unknown" : "unknown";
          const { data: owner } = await supabase
            .from("org_members")
            .select("user_id")
            .eq("org_id", orgId)
            .in("role", ["owner", "admin"])
            .limit(1)
            .maybeSingle();
          if (owner) {
            await supabase.from("usage_logs").insert({
              org_id: orgId,
              user_id: owner.user_id,
              credits_used: -creditsAmount,
              description: `Subscription renewal (${tier}) — ${creditsAmount} credits added`,
            });
          }
        } else {
          console.log("[STRIPE-WEBHOOK] invoice.paid — no credits to add");
        }

        if (customerId) {
          await supabase
            .from("organizations")
            .update({ stripe_customer_id: String(customerId) })
            .eq("id", orgId);
        }

        if (customerId) {
          try {
            const subs = await stripe.subscriptions.list({
              customer: customerId,
              status: "active",
              limit: 1,
            });
            if (subs.data.length > 0 && orgId) {
              await syncSubscriptionCache(subs.data[0], orgId);
            }
          } catch (syncErr) {
            console.error(`[STRIPE-WEBHOOK] Cache sync on invoice.paid failed: ${syncErr}`);
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string | null;
        const orgId = await resolveOrgId(
          typeof customerId === "string" ? customerId : null,
          subscription.metadata as Record<string, string>
        );

        if (!orgId) {
          console.log(`[STRIPE-WEBHOOK] ${event.type} — no org_id mapped, skipping`);
          break;
        }

        if (event.type === "customer.subscription.deleted") {
          await supabase.rpc("upsert_subscription_cache", {
            _org_id: orgId,
            _tier: null,
            _seat_count: 0,
            _seat_price: 0,
            _subscription_id: null,
            _subscription_end: null,
          });
          console.log(`[STRIPE-WEBHOOK] Subscription deleted — cleared cache for org ${orgId}`);
        } else {
          await syncSubscriptionCache(subscription, orgId);
        }
        break;
      }

      default:
        console.log(`[STRIPE-WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[STRIPE-WEBHOOK] Processing error: ${message}`);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
