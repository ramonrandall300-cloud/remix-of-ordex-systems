import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Dna } from "lucide-react";
import { toast } from "sonner";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";

type AuthMode = "login" | "signup" | "forgot";

export default function Auth() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const prefix = lang || "en";
  const lp = (path: string) => `/${prefix}${path}`;
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get("invite");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/${prefix}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent! Check your email.");
        setMode("login");
      } else if (mode === "login") {
        if (!password.trim()) { toast.error("Please enter your password"); setLoading(false); return; }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in successfully");
        navigate(inviteId ? `/team?invite=${inviteId}` : "/dashboard");
      } else {
        if (!fullName.trim()) { toast.error("Please enter your full name"); setLoading(false); return; }
        if (!password.trim()) { toast.error("Please enter a password"); setLoading(false); return; }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Account created! Choose a plan to get started.");
        navigate(inviteId ? `/team?invite=${inviteId}` : "/choose-plan");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const heading = mode === "forgot" ? t("auth.resetTitle") : mode === "login" ? t("auth.signInTitle") : t("auth.signUpTitle");
  const buttonLabel = mode === "forgot" ? t("auth.resetBtn") : mode === "login" ? t("auth.signInBtn") : t("auth.signUpBtn");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <Link to={lp("/")} className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t("auth.backToHome")}
      </Link>
      <div className="w-full max-w-md glass-card p-8 space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Dna className="w-10 h-10 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">ORDEX Systems</h1>
          <p className="text-sm text-muted-foreground">{heading}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("auth.fullName")}</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Dr. Jane Smith"
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t("auth.email")}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {mode !== "forgot" && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("auth.password")}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          {mode === "login" && (
            <div className="text-right">
              <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                {t("auth.forgotPassword")}
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? t("auth.pleaseWait") : buttonLabel}
          </button>
        </form>


        <p className="text-center text-sm text-muted-foreground">
          {mode === "forgot" ? (
            <button onClick={() => setMode("login")} className="text-primary hover:underline">{t("auth.backToSignIn")}</button>
          ) : mode === "login" ? (
            <>{t("auth.noAccount")}{" "}<button onClick={() => setMode("signup")} className="text-primary hover:underline">{t("auth.signUp")}</button></>
          ) : (
            <>{t("auth.hasAccount")}{" "}<button onClick={() => setMode("login")} className="text-primary hover:underline">{t("nav.signIn")}</button></>
          )}
        </p>
      </div>
    </div>
  );
}
