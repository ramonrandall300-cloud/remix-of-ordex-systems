import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Users, UserPlus, Mail, Shield, Crown, Trash2, Clock, Loader2, CreditCard, Plus, Minus, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrgContext } from "@/contexts/OrgContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSubscription } from "@/hooks/useSubscription";

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  full_name?: string;
}

interface UsageByUser {
  user_id: string;
  total: number;
}

export default function TeamPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeOrg, orgId } = useOrgContext();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [updatingSeats, setUpdatingSeats] = useState(false);
  const [seatConfirm, setSeatConfirm] = useState<{ delta: number; newCount: number } | null>(null);
  const { subscribed, seatCount, seatPricePerMonth, tierLabel, subscriptionId, refetch: refetchSubscription } = useSubscription();

  const isAdmin = activeOrg?.role === "admin" || activeOrg?.role === "owner";

  // Accept invite from URL
  useEffect(() => {
    const inviteId = searchParams.get("invite");
    if (inviteId && user) {
      supabase.functions.invoke("accept-invite", { body: { inviteId } })
        .then(({ data, error }) => {
          if (error) {
            toast.error("Failed to accept invite");
            return;
          }
          if (data?.alreadyMember) {
            toast.info("You're already a member of this organization");
          } else {
            toast.success("Invite accepted! You've joined the organization.");
            queryClient.invalidateQueries({ queryKey: ["user-orgs"] });
          }
          queryClient.invalidateQueries({ queryKey: ["team-members"] });
        });
    }
  }, [searchParams, user]);

  // Fetch members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["team-members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_org_members_with_profile", {
        _org_id: orgId!,
      });
      if (error) throw error;
      return (data || []) as MemberRow[];
    },
  });

  // Fetch per-member credit usage (current month)
  const { data: usageMap = {} } = useQuery<Record<string, number>>({
    queryKey: ["team-usage", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("usage_logs")
        .select("user_id, credits_used")
        .eq("org_id", orgId!)
        .gte("created_at", startOfMonth.toISOString());
      if (error) throw error;

      const map: Record<string, number> = {};
      for (const row of data || []) {
        map[row.user_id] = (map[row.user_id] || 0) + row.credits_used;
      }
      return map;
    },
  });

  const totalUsage = Object.values(usageMap).reduce((a, b) => a + b, 0);

  // Fetch pending invites
  const { data: invites = [] } = useQuery({
    queryKey: ["team-invites", orgId],
    enabled: !!orgId && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_invites")
        .select("id, email, role, created_at, expires_at")
        .eq("org_id", orgId!)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !orgId) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: { email: inviteEmail.trim(), role: inviteRole, orgId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["team-invites"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!orgId) return;
    setRemoving(memberId);
    try {
      const { data, error } = await supabase.functions.invoke("remove-member", {
        body: { memberId, orgId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRemoving(null);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase.from("org_invites").delete().eq("id", inviteId);
      if (error) throw error;
      toast.success("Invite cancelled");
      queryClient.invalidateQueries({ queryKey: ["team-invites"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const requestSeatChange = (delta: number) => {
    if (!orgId || !subscribed) return;
    const newCount = seatCount + delta;
    if (newCount < 1) return;
    if (newCount < members.length) {
      toast.error(`Cannot reduce below ${members.length} (current members). Remove members first.`);
      return;
    }
    setSeatConfirm({ delta, newCount });
  };

  const confirmSeatChange = async () => {
    if (!seatConfirm || !orgId) return;
    setUpdatingSeats(true);
    setSeatConfirm(null);
    try {
      const { data, error } = await supabase.functions.invoke("manage-seats", {
        body: { orgId, newSeatCount: seatConfirm.newCount },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Seats updated to ${seatConfirm.newCount}`);
      refetchSubscription();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUpdatingSeats(false);
    }
  };

  const seatDelta = seatConfirm?.delta ?? 0;
  const isAdding = seatDelta > 0;
  const proratedEstimate = Math.abs(seatDelta) * seatPricePerMonth;

  const roleIcon = (role: string) => {
    if (role === "owner") return <Crown className="w-4 h-4 text-yellow-500" />;
    if (role === "admin") return <Shield className="w-4 h-4 text-primary" />;
    return <Users className="w-4 h-4 text-muted-foreground" />;
  };

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      owner: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      admin: "bg-primary/10 text-primary border-primary/20",
      member: "bg-muted text-muted-foreground border-border",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[role] || styles.member}`}>
        {roleIcon(role)}
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("team.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("team.subtitle")}</p>
        </div>
        {subscribed && (
          <div className="glass-card px-4 py-3 text-right min-w-[200px]">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CreditCard className="w-4 h-4 text-primary" />
              {tierLabel} Plan
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {members.length} of {seatCount} seat{seatCount !== 1 ? "s" : ""} used · ${seatPricePerMonth}/mo per seat
            </p>
            {seatCount > 0 && (
              <div className="mt-2 w-full bg-secondary rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${Math.min((members.length / seatCount) * 100, 100)}%`,
                    backgroundColor: members.length >= seatCount ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
                  }}
                />
              </div>
            )}
            {/* Seat management buttons for admins */}
            {isAdmin && (
              <div className="flex items-center justify-end gap-2 mt-3">
                <button
                  onClick={() => requestSeatChange(-1)}
                  disabled={updatingSeats || seatCount <= 1 || seatCount <= members.length}
                  className="p-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Remove seat"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-medium text-foreground tabular-nums min-w-[2ch] text-center">
                  {updatingSeats ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : seatCount}
                </span>
                <button
                  onClick={() => requestSeatChange(1)}
                  disabled={updatingSeats}
                  className="p-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Add seat"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-muted-foreground ml-1">seats</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite section */}
      {isAdmin && (
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {t("team.inviteMember")}
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="email"
                placeholder={t("team.emailPlaceholder")}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none"
            >
              <option value="member">{t("team.roleMember")}</option>
              <option value="admin">{t("team.roleAdmin")}</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {t("team.sendInvite")}
            </button>
          </div>
        </div>
      )}

      {/* Members list with usage */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {t("team.members")} ({members.length})
          </h2>
          {totalUsage > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              {totalUsage} credits this month
            </span>
          )}
        </div>

        {membersLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => {
              const memberUsage = usageMap[member.user_id] || 0;
              const usagePercent = totalUsage > 0 ? (memberUsage / totalUsage) * 100 : 0;

              return (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-foreground shrink-0">
                      {member.user_id === user?.id ? "You" : (member.full_name || member.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.user_id === user?.id
                          ? (user?.user_metadata?.full_name || user?.email)
                          : (member.full_name || member.email || "User")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email && member.user_id !== user?.id && <span>{member.email} · </span>}
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </p>
                      {/* Usage bar */}
                      {memberUsage > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 max-w-[120px] bg-secondary rounded-full h-1">
                            <div
                              className="h-1 rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {memberUsage} credits
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {roleBadge(member.role)}
                    {isAdmin && member.role !== "owner" && member.user_id !== user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            disabled={removing === member.id}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10"
                          >
                            {removing === member.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("team.removeMemberTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>{t("team.removeMemberDesc")}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("team.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemove(member.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t("team.remove")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {isAdmin && invites.length > 0 && (
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            {t("team.pendingInvites")} ({invites.length})
          </h2>
          <div className="divide-y divide-border">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {roleBadge(invite.role)}
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seat change confirmation dialog */}
      <AlertDialog open={!!seatConfirm} onOpenChange={(open) => !open && setSeatConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAdding ? "Add" : "Remove"} {Math.abs(seatDelta)} seat{Math.abs(seatDelta) !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Current seats</span>
                  <span className="font-medium text-foreground">{seatCount}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">New seats</span>
                  <span className="font-medium text-foreground">{seatConfirm?.newCount ?? seatCount}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Per seat</span>
                  <span className="font-medium text-foreground">${seatPricePerMonth}/mo</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">
                    {isAdding ? "Prorated charge" : "Prorated credit"}
                  </span>
                  <span className={`font-semibold ${isAdding ? "text-foreground" : "text-green-500"}`}>
                    {isAdding ? "+" : "−"}${proratedEstimate.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isAdding
                    ? "You'll be charged a prorated amount for the remainder of this billing cycle."
                    : "A prorated credit will be applied to your next invoice."}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSeatChange}>
              {isAdding ? "Add seat" : "Remove seat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
