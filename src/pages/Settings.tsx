import { useState, useEffect, useCallback } from "react";
import { ProfilePictureUpload } from "@/components/settings/ProfilePictureUpload";
import { useTranslation } from "react-i18next";
import { Save, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { useAuth } from "@/hooks/useAuth";
import { useOrgContext } from "@/contexts/OrgContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeOrg, orgs } = useOrgContext();
  const queryClient = useQueryClient();
  const navigate = useLocalizedNavigate();

  const settingsTabs = [t("settings.profile"), t("settings.workspace")];

  const [activeTab, setActiveTab] = useState(t("settings.profile"));
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("Eastern Time (UTC-05:00)");
  
  const [showConfidence, setShowConfidence] = useState(true);
  const [autoApproveCredits, setAutoApproveCredits] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setFullName(user.user_metadata?.full_name || "");
      setTimezone(user.user_metadata?.timezone || "Eastern Time (UTC-05:00)");
      
      setShowConfidence(user.user_metadata?.show_confidence !== false);
      setAutoApproveCredits(user.user_metadata?.auto_approve_credits === true);
    }
  }, [user]);

  useEffect(() => {
    setWorkspaceName(activeOrg?.org_name || "");
  }, [activeOrg]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          timezone,
          
          show_confidence: showConfidence,
          auto_approve_credits: autoApproveCredits,
        },
      });
      if (error) throw error;

      if (activeOrg && workspaceName.trim() && workspaceName !== activeOrg.org_name) {
        const { error: orgErr } = await supabase
          .from("organizations")
          .update({ name: workspaceName.trim() })
          .eq("id", activeOrg.org_id);
        if (orgErr) throw orgErr;
      }

      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error(`Failed to save: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFullName(user?.user_metadata?.full_name || "");
    setTimezone(user?.user_metadata?.timezone || "Eastern Time (UTC-05:00)");
    
    setShowConfidence(user?.user_metadata?.show_confidence !== false);
    setAutoApproveCredits(user?.user_metadata?.auto_approve_credits === true);
    setWorkspaceName(activeOrg?.org_name || "");
    toast.info("Settings reset to saved values");
  };

  const isProfileTab = activeTab === t("settings.profile");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("settings.subtitle")}</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-2 space-y-1">
          {settingsTabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-left px-3 py-2 text-sm rounded-md ${activeTab === tab ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{tab}</button>
          ))}
        </div>

        <div className="col-span-12 md:col-span-10 space-y-6">
          {isProfileTab && (
            <ProfileSection
              t={t}
              fullName={fullName} setFullName={setFullName}
              email={email} timezone={timezone} setTimezone={setTimezone}
              showConfidence={showConfidence} setShowConfidence={setShowConfidence}
              autoApproveCredits={autoApproveCredits} setAutoApproveCredits={setAutoApproveCredits}
              saving={saving} onSave={handleSaveProfile} onReset={handleReset}
              user={user}
              onAvatarUpdated={() => supabase.auth.getUser()}
            />
          )}

          {!isProfileTab && (
            <WorkspaceSection
              t={t}
              workspaceName={workspaceName} setWorkspaceName={setWorkspaceName}
              orgId={activeOrg?.org_id}
              orgRole={activeOrg?.role}
              orgCount={orgs.length}
              saving={saving} onSave={handleSaveProfile}
              onDelete={async () => {
                try {
                  const { error } = await supabase.rpc("delete_organization", { _org_id: activeOrg!.org_id });
                  if (error) throw error;
                  toast.success("Workspace deleted");
                  await queryClient.invalidateQueries({ queryKey: ["user-orgs"] });
                } catch (err) {
                  toast.error(`Failed to delete: ${(err as Error).message}`);
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ t, fullName, setFullName, email, timezone, setTimezone, showConfidence, setShowConfidence, autoApproveCredits, setAutoApproveCredits, saving, onSave, onReset, user, onAvatarUpdated }: any) {
  return (
    <div className="glass-card p-5 space-y-4">
      <h2 className="font-semibold text-foreground">👤 {t("settings.profileSettings")}</h2>
      <ProfilePictureUpload user={user} onUpdated={onAvatarUpdated} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t("settings.fullName")}</label>
          <input value={fullName} onChange={(e: any) => setFullName(e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t("settings.timeZone")}</label>
          <select value={timezone} onChange={(e: any) => setTimezone(e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none">
            <option>Eastern Time (UTC-05:00)</option>
            <option>Central European Time (UTC+01:00)</option>
            <option>Pacific Time (UTC-08:00)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t("settings.emailAddress")}</label>
          <input value={email} readOnly className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-muted-foreground focus:outline-none cursor-not-allowed" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-6">
          <ToggleSwitch label={t("settings.confidenceScores")} value={showConfidence} onChange={setShowConfidence} />
        </div>
        <div className="flex gap-6">
          <ToggleSwitch label={t("settings.skipCreditPreview")} value={autoApproveCredits} onChange={setAutoApproveCredits} />
        </div>
        <p className="text-xs text-muted-foreground">{t("settings.skipCreditDesc")}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onSave} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? t("settings.saving") : t("settings.saveProfile")}
        </button>
        <button onClick={onReset} className="flex items-center gap-2 border border-border px-4 py-2 rounded-md text-sm text-foreground hover:bg-secondary"><RotateCcw className="w-4 h-4" /> {t("settings.reset")}</button>
      </div>
    </div>
  );
}

function WorkspaceSection({ t, workspaceName, setWorkspaceName, orgId, orgRole, orgCount, saving, onSave, onDelete }: any) {
  const [deleting, setDeleting] = useState(false);
  const isAdmin = orgRole === "admin" || orgRole === "owner";

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold text-foreground">🏢 {t("settings.workspaceConfig")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t("settings.workspaceName")}</label>
            <input value={workspaceName} onChange={(e: any) => setWorkspaceName(e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t("settings.orgId")}</label>
            <input value={orgId || "—"} readOnly className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-muted-foreground focus:outline-none cursor-not-allowed font-mono text-xs" />
          </div>
        </div>
        <button onClick={onSave} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? t("settings.saving") : t("settings.saveWorkspace")}
        </button>
      </div>

      {isAdmin && (
        <div className="glass-card p-5 space-y-3 border border-destructive/30">
          <h2 className="font-semibold text-destructive">⚠️ Danger Zone</h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete this workspace and all its data including projects, jobs, credits, and team members. This action cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-destructive/90 disabled:opacity-50" disabled={deleting}>
                <Trash2 className="w-4 h-4" /> {deleting ? "Deleting..." : "Delete Workspace"}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{workspaceName}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the workspace, all projects, jobs, credits, usage history, and remove all team members. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleting ? "Deleting..." : "Yes, Delete Workspace"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button onClick={() => onChange(!value)} className={`w-9 h-5 rounded-full transition-colors relative ${value ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-foreground transition-transform ${value ? "left-4" : "left-0.5"}`} />
      </button>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}
