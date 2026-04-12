import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrganization() {
  return useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: member, error: memberErr } = await supabase
        .from("org_members")
        .select("org_id, role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (memberErr) throw memberErr;
      if (!member) return null;

      const { data: org, error: orgErr } = await supabase
        .from("organizations_safe")
        .select("*")
        .eq("id", member.org_id)
        .single();
      if (orgErr) throw orgErr;

      return { ...org, role: member.role };
    },
  });
}
