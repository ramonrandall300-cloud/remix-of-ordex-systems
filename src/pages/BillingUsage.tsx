import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart, Pie, Cell } from "recharts";
import { Download, CreditCard, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrgContext } from "@/contexts/OrgContext";
import { useCredits } from "@/hooks/useCredits";
import { useUsageLogs } from "@/hooks/useUsageLogs";
import { useProteinJobs } from "@/hooks/useProteinJobs";
import { useDockingJobs } from "@/hooks/useDockingJobs";
import { supabase } from "@/integrations/supabase/client";
import { useOrgRealtime } from "@/hooks/useOrgRealtime";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const CREDIT_PACKS = [
  { label: "100 Credits",  credits: 100,  priceId: "price_1TJIndB2XJSLlpZrUbnzZmhr", price: "$9.99" },
  { label: "500 Credits",  credits: 500,  priceId: "price_1TJIoIB2XJSLlpZrRFytyi6Y", price: "$39.99" },
  { label: "1,000 Credits", credits: 1000, priceId: "price_1TJIoaB2XJSLlpZrq1TUWZec", price: "$69.99", popular: true },
  { label: "2,500 Credits", credits: 2500, priceId: "price_1TJIoyB2XJSLlpZrbRx9O825", price: "$149.99" },
];

export default function BillingUsage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { orgId } = useOrgContext();
  const { data: creditData, refetch: refetchCredits } = useCredits(orgId);
  const { data: usageLogs = [] } = useUsageLogs(orgId);
  const { data: proteinJobs = [] } = useProteinJobs();
  const { data: dockingJobs = [] } = useDockingJobs();
  const [buyingPack, setBuyingPack] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  const creditsBalance = creditData?.balance ?? 0;

  const realtimeSubs = useMemo(() => [
    { table: "org_credits", onMessage: () => refetchCredits() },
  ], [refetchCredits]);
  useOrgRealtime(orgId, realtimeSubs);

  const spendByDay: Record<string, number> = {};
  usageLogs.forEach(log => {
    const day = new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    spendByDay[day] = (spendByDay[day] || 0) + log.credits_used;
  });
  const spendData = Object.entries(spendByDay).map(([day, credits]) => ({ day, credits })).slice(-30);

  const proteinCredits = proteinJobs.reduce((s, j) => s + j.estimated_credits, 0);
  const dockingCredits = dockingJobs.reduce((s, j) => s + j.estimated_credits, 0);
  const totalCreditsUsed = usageLogs.reduce((s, l) => s + l.credits_used, 0);
  const synbioCredits = Math.max(0, totalCreditsUsed - proteinCredits - dockingCredits);

  const costBreakdown = [
    { name: t("billing.proteinPrediction"), value: proteinCredits, color: "hsl(172 66% 50%)" },
    { name: t("billing.molecularDocking"), value: dockingCredits, color: "hsl(280 65% 60%)" },
    { name: t("billing.synbioDesign"), value: synbioCredits, color: "hsl(38 92% 50%)" },
  ].filter(c => c.value > 0);

  if (costBreakdown.length === 0) costBreakdown.push({ name: t("billing.noUsage"), value: 1, color: "hsl(215 15% 35%)" });

  const handleBuyCredits = async (pack: typeof CREDIT_PACKS[0]) => {
    if (!user || !orgId) {
      toast.error("Please sign in first");
      return;
    }
    setBuyingPack(pack.priceId);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { orgId, priceId: pack.priceId, creditsAmount: pack.credits },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (e) {
      toast.error(`Checkout failed: ${(e as Error).message}`);
    } finally {
      setBuyingPack(null);
    }
  };

  const handleExport = () => {
    const csv = ["Date,Description,Credits Used", ...usageLogs.map(l =>
      `${new Date(l.created_at).toISOString()},${(l.description || "Job").replace(/,/g, ";")},${l.credits_used}`
    )].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "usage-export.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Usage data exported");
  };

  const { subscribed, tierLabel, subscriptionEnd, refetch: refetchSub } = useSubscription();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("billing.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("billing.subtitle")}</p>
      </div>

      {/* Subscription Status */}
      <div className={`glass-card p-5 border ${subscribed ? "border-primary/40" : "border-border"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className={`w-5 h-5 ${subscribed ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <h2 className="font-semibold text-foreground">
                {subscribed ? `${tierLabel} Plan` : t("billing.noActiveSub")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {subscribed && subscriptionEnd
                  ? t("billing.renews", { date: new Date(subscriptionEnd).toLocaleDateString() })
                  : t("billing.subscribeBelow")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {subscribed && (
              <button
                onClick={async () => {
                  setOpeningPortal(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("customer-portal");
                    if (error) throw error;
                    if (data?.url) window.location.href = data.url;
                    else throw new Error("No portal URL returned");
                  } catch (e) {
                    toast.error(`Portal failed: ${(e as Error).message}`);
                  } finally {
                    setOpeningPortal(false);
                  }
                }}
                disabled={openingPortal}
                className="text-xs text-primary hover:text-primary/80 border border-primary/40 px-3 py-1 rounded"
              >
                {openingPortal ? t("billing.opening") : t("billing.manageSubscription")}
              </button>
            )}
            <button
              onClick={() => refetchSub()}
              className="text-xs text-muted-foreground hover:text-foreground border border-border px-2 py-1 rounded"
            >
              {t("billing.refresh")}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">{t("billing.creditsBalance")}</p>
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <span className="text-2xl font-bold text-foreground">{creditsBalance.toLocaleString()}</span>
          <p className="text-xs text-muted-foreground mt-1">{t("billing.organization")}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground mb-1">{t("billing.totalUsed")}</p>
          <span className="text-2xl font-bold text-foreground">{Math.abs(totalCreditsUsed).toLocaleString()}</span>
          <p className="text-xs text-muted-foreground mt-1">{t("billing.transactions", { count: usageLogs.length })}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground mb-1">{t("billing.proteinJobs")}</p>
          <span className="text-2xl font-bold text-foreground">{proteinJobs.length}</span>
          <p className="text-xs text-muted-foreground mt-1">{proteinCredits} {t("billing.credits")}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground mb-1">{t("billing.dockingJobs")}</p>
          <span className="text-2xl font-bold text-foreground">{dockingJobs.length}</span>
          <p className="text-xs text-muted-foreground mt-1">{dockingCredits} {t("billing.credits")}</p>
        </div>
      </div>

      {/* Buy Credits */}
      <div className="glass-card p-5">
        <h2 className="font-semibold text-foreground mb-1">{t("billing.buyCredits")}</h2>
        <p className="text-xs text-muted-foreground mb-4">{t("billing.buyCreditsDesc")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CREDIT_PACKS.map(pack => (
            <div key={pack.priceId} className={`border rounded-lg p-4 hover:border-primary transition-colors relative ${(pack as any).popular ? "border-primary ring-1 ring-primary" : "border-border"}`}>
              {(pack as any).popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{t("billing.bestValue")}</span>
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{pack.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground mb-3">{pack.price}</p>
              <button
                onClick={() => handleBuyCredits(pack)}
                disabled={buyingPack === pack.priceId}
                className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {buyingPack === pack.priceId ? t("billing.redirecting") : t("billing.buyNow")}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5">
          <h2 className="font-semibold text-foreground mb-4">{t("billing.creditUsageTrend")}</h2>
          {spendData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">{t("billing.noUsageData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={spendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 22%)" />
                <XAxis dataKey="day" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} stroke="hsl(220 15% 22%)" />
                <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} stroke="hsl(220 15% 22%)" />
                <Tooltip contentStyle={{ background: "hsl(220 20% 14%)", border: "1px solid hsl(220 15% 22%)", borderRadius: 8, color: "hsl(210 20% 90%)" }} />
                <Line type="monotone" dataKey="credits" stroke="hsl(172 66% 50%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-5">
          <h2 className="font-semibold text-foreground mb-4">{t("billing.costBreakdown")}</h2>
          <div className="flex justify-center">
            <PieChart width={180} height={180}>
              <Pie data={costBreakdown} dataKey="value" cx={90} cy={90} innerRadius={50} outerRadius={80} strokeWidth={0}>
                {costBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {costBreakdown.map((c, i) => (
              <span key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name} ({c.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Usage Log Table */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">{t("billing.usageHistory")}</h2>
          <button onClick={handleExport} className="flex items-center gap-1 text-sm text-foreground border border-border px-3 py-1.5 rounded-md hover:bg-secondary">
            <Download className="w-3 h-3" /> {t("billing.exportCsv")}
          </button>
        </div>
        {usageLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t("billing.noUsageHistory")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-2 font-medium">{t("billing.description")}</th>
                <th className="text-left py-2 font-medium">{t("billing.credits")}</th>
                <th className="text-left py-2 font-medium">{t("billing.date")}</th>
              </tr>
            </thead>
            <tbody>
              {usageLogs.slice(0, 20).map((log, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2 text-foreground">{log.description || "Job"}</td>
                  <td className="py-2 font-medium text-foreground">{log.credits_used}</td>
                  <td className="py-2 text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
