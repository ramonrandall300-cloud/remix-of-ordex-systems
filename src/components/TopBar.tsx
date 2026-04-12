import { useState } from "react";
import { Search, HelpCircle, LogOut, Coins } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useOrgContext } from "@/contexts/OrgContext";
import { useCredits } from "@/hooks/useCredits";
import OrgSwitcher from "./OrgSwitcher";
import NotificationsDropdown from "./NotificationsDropdown";
import LanguageSwitcher from "./LanguageSwitcher";
import CommandPalette from "./CommandPalette";
import { supabase } from "@/integrations/supabase/client";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { toast } from "sonner";

export default function TopBar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { orgId } = useOrgContext();
  const { data: creditData } = useCredits(orgId);
  const navigate = useLocalizedNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success(t("topbar.signedOut"));
    navigate("/auth");
  };

  return (
    <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-sidebar">
      <OrgSwitcher />

      <button
        onClick={() => setCmdOpen(true)}
        className="flex-1 max-w-md mx-auto hidden md:flex items-center gap-2 bg-secondary border border-border rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors cursor-pointer"
      >
        <Search className="w-4 h-4" />
        <span>{t("nav.search")}...</span>
        <kbd className="ml-auto pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      <div className="flex items-center gap-3 ml-auto">
        <button className="text-muted-foreground hover:text-foreground md:hidden" onClick={() => setCmdOpen(true)}><Search className="w-5 h-5" /></button>
        <LanguageSwitcher />
        <NotificationsDropdown />
        <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground hidden sm:block" title="Help & Settings"><HelpCircle className="w-5 h-5" /></button>
        <button
          onClick={() => navigate("/billing")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
          title={t("topbar.credits")}
        >
          <Coins className="w-4 h-4" />
          <span>{creditData?.balance?.toLocaleString() ?? "—"}</span>
        </button>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-primary text-sm font-medium">
            {initials}
          </div>
          <span className="text-sm text-foreground hidden lg:inline">{displayName}</span>
        </div>
        <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground" title="Sign out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
