import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get("invite");

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message || "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      toast.success("Signed in with Google");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

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

        {mode !== "forgot" && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{t("auth.or", "or")}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2 border border-border bg-secondary rounded-md py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? t("auth.pleaseWait") : t("auth.googleSignIn", "Continue with Google")}
            </button>
          </>
        )}

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
