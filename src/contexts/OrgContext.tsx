import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface OrgMembership {
  org_id: string;
  role: string;
  org_name: string;
}

interface OrgContextValue {
  /** All orgs the user belongs to */
  orgs: OrgMembership[];
  /** Currently active org */
  activeOrg: OrgMembership | null;
  /** Switch active org */
  switchOrg: (orgId: string) => void;
  /** Shortcut: active org_id or undefined */
  orgId: string | undefined;
  /** Loading state */
  isLoading: boolean;
}

const OrgContext = createContext<OrgContextValue>({
  orgs: [],
  activeOrg: null,
  switchOrg: () => {},
  orgId: undefined,
  isLoading: true,
});

const STORAGE_KEY = "ordex_active_org";

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const autoCreatingRef = useRef(false);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  // Fetch all orgs the user belongs to
  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["user-orgs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Use the safe view (excludes stripe_customer_id) via RPC
      const { data: memberRows, error: mErr } = await supabase
        .from("org_members")
        .select("org_id, role")
        .eq("user_id", user!.id);
      if (mErr) throw mErr;
      if (!memberRows || memberRows.length === 0) return [];

      // Fetch org names from the safe view
      const orgIds = memberRows.map(m => m.org_id);
      const { data: orgs, error: oErr } = await supabase
        .from("organizations_safe")
        .select("id, name")
        .in("id", orgIds);
      if (oErr) throw oErr;

      const orgMap = new Map((orgs ?? []).map(o => [o.id, o.name]));
      return memberRows.map((m) => ({
        org_id: m.org_id,
        role: m.role,
        org_name: orgMap.get(m.org_id) ?? "Unknown",
      })) as OrgMembership[];
    },
  });

  // Auto-create org for new users who have none
  useEffect(() => {
    if (isLoading || !user || orgs.length > 0 || autoCreatingRef.current) return;
    autoCreatingRef.current = true;

    const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "My";
    const orgName = `${userName}'s Lab`;

    supabase.functions.invoke("create-organization", { body: { name: orgName } })
      .then(({ data, error }) => {
        if (error) {
          console.error("Auto-org creation failed:", error);
          toast.error("Failed to set up your workspace. Please create an organization manually.");
          return;
        }
        toast.success(`Welcome! "${orgName}" workspace created with 500 starter credits.`);
        queryClient.invalidateQueries({ queryKey: ["user-orgs", user.id] });
        if (data?.id) {
          setActiveOrgId(data.id);
          try { localStorage.setItem(STORAGE_KEY, data.id); } catch {}
        }
      })
      .finally(() => { autoCreatingRef.current = false; });
  }, [isLoading, user, orgs.length, queryClient]);

  // Auto-select org
  useEffect(() => {
    if (orgs.length === 0) return;
    const stored = orgs.find(o => o.org_id === activeOrgId);
    if (!stored) {
      const first = orgs[0];
      setActiveOrgId(first.org_id);
      try { localStorage.setItem(STORAGE_KEY, first.org_id); } catch {}
    }
  }, [orgs, activeOrgId]);

  const switchOrg = useCallback((orgId: string) => {
    setActiveOrgId(orgId);
    try { localStorage.setItem(STORAGE_KEY, orgId); } catch {}
    // Invalidate org-scoped queries
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    queryClient.invalidateQueries({ queryKey: ["credits"] });
    queryClient.invalidateQueries({ queryKey: ["organization"] });
  }, [queryClient]);

  const activeOrg = orgs.find(o => o.org_id === activeOrgId) ?? orgs[0] ?? null;

  return (
    <OrgContext.Provider value={{
      orgs,
      activeOrg,
      switchOrg,
      orgId: activeOrg?.org_id,
      isLoading,
    }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrgContext() {
  return useContext(OrgContext);
}
