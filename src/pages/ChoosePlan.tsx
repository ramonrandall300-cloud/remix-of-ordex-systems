import { useState } from "react";
import { Dna, Zap, Loader2 } from "lucide-react";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/contexts/OrgContext";
import { toast } from "sonner";

const PLANS = [
  {
    label: "Free",
    credits: 500,
    priceId: null,
    seatPriceId: null,
    price: 0,
    seatPrice: 0,
    retention: "7 days",
    features: ["500 free credits", "Full AI analysis suite", "Advanced docking params", "All export formats", "Mutation simulator", "Primer design & ORF tools", "Standard processing", "Batch jobs & SSO"],
  },
  {
    label: "Starter",
    credits: 500,
    priceId: "price_1TIMg6B2XJSLlpZr51kZn4Fm",
    seatPriceId: "price_1TJa7EB2XJSLlpZrSjVfQhbf",
    price: 49,
    seatPrice: 15,
    retention: "30 days",
    features: ["500 credits/month", "Full AI analysis suite", "Advanced docking params", "All export formats", "Mutation simulator", "Primer design & ORF tools", "Standard processing", "Batch jobs & SSO"],
  },
  {
    label: "Professional",
    credits: 2000,
    priceId: "price_1TIMgrB2XJSLlpZrlNVkCAQI",
    seatPriceId: "price_1TJa9IB2XJSLlpZrBGhiwfD3",
    price: 199,
    seatPrice: 25,
    popular: true,
    retention: "90 days",
    features: ["2,000 credits/month", "Full AI analysis suite", "Advanced docking params", "All export formats", "Mutation simulator", "Primer design & ORF tools", "Priority processing", "Batch jobs & SSO"],
  },
  {
    label: "Elite",
    credits: 5000,
    priceId: "price_1TIMhSB2XJSLlpZrakAOOWgi",
    seatPriceId: "price_1TJaDNB2XJSLlpZrTMhlrj4e",
    price: 499,
    seatPrice: 35,
    retention: "365 days",
    features: ["5,000 credits/month", "Full AI analysis suite", "Advanced docking params", "All export formats", "Mutation simulator", "Primer design & ORF tools", "Dedicated processing", "Batch jobs & SSO"],
  },
];

export default function ChoosePlan() {
  const navigate = useLocalizedNavigate();
  const { orgId, isLoading: orgLoading } = useOrgContext();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelect = async (plan: typeof PLANS[number]) => {
    // Free plan — skip checkout, go straight to dashboard
    if (!plan.priceId) {
      navigate("/dashboard");
      return;
    }
    if (!orgId) {
      toast.error("Workspace is still being set up. Please wait a moment.");
      return;
    }
    setLoadingPlan(plan.priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { orgId, priceId: plan.priceId, creditsAmount: plan.credits },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-2 mb-8">
        <Dna className="w-10 h-10 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Choose Your Plan</h1>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Select a subscription to unlock the full power of ORDEX Systems. You already have 500 free credits to get started.
        </p>
      </div>

      {orgLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Setting up your workspace…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl">
          {PLANS.map((plan) => (
            <button
              key={plan.priceId}
              onClick={() => handleSelect(plan)}
              disabled={!!loadingPlan}
              className={`relative flex flex-col items-start p-6 rounded-lg border text-left transition-all hover:border-primary hover:shadow-lg disabled:opacity-60 ${
                plan.popular
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                  Most Popular
                </span>
              )}
              <h2 className="text-lg font-semibold text-foreground">{plan.label}</h2>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                <span className="text-sm text-muted-foreground">/month</span>
                {plan.seatPrice > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">+ ${plan.seatPrice}/seat/month</p>
                )}
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="w-full bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium text-center">
                {loadingPlan === plan.priceId ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : plan.priceId ? (
                  "Subscribe"
                ) : (
                  "Get Started Free"
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate("/dashboard")}
        className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip for now — use free credits
      </button>
    </div>
  );
}
