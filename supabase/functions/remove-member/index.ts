import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !userData.user) throw new Error("Unauthorized");
    const callerId = userData.user.id;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { memberId, orgId } = await req.json();
    if (!memberId || !orgId) throw new Error("memberId and orgId are required");

    // Verify caller is admin/owner
    const { data: callerMember } = await adminClient
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", callerId)
      .single();

    if (!callerMember || !["admin", "owner"].includes(callerMember.role)) {
      throw new Error("Only admins can remove members");
    }

    // Get the target member
    const { data: targetMember } = await adminClient
      .from("org_members")
      .select("id, user_id, role")
      .eq("id", memberId)
      .eq("org_id", orgId)
      .single();

    if (!targetMember) throw new Error("Member not found");

    // Can't remove owner
    if (targetMember.role === "owner") {
      throw new Error("Cannot remove the organization owner");
    }

    // Can't remove yourself if you're the only admin
    if (targetMember.user_id === callerId) {
      throw new Error("You cannot remove yourself. Leave the organization instead.");
    }

    // Remove the member
    const { error: deleteErr } = await adminClient
      .from("org_members")
      .delete()
      .eq("id", memberId);

    if (deleteErr) throw new Error(`Failed to remove member: ${deleteErr.message}`);

    console.log(`[REMOVE-MEMBER] Removed member ${memberId} from org ${orgId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[REMOVE-MEMBER] Error: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
