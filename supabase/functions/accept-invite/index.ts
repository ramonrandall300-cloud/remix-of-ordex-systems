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
    const userId = userData.user.id;
    const userEmail = userData.user.email?.toLowerCase();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { inviteId } = await req.json();
    if (!inviteId) throw new Error("inviteId is required");

    // Get invite
    const { data: invite, error: inviteErr } = await adminClient
      .from("org_invites")
      .select("*")
      .eq("id", inviteId)
      .single();

    if (inviteErr || !invite) throw new Error("Invite not found");

    // Verify email matches
    if (invite.email !== userEmail) {
      throw new Error("This invite is for a different email address");
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      throw new Error("This invite has expired");
    }

    // Check not already a member
    const { data: existingMember } = await adminClient
      .from("org_members")
      .select("id")
      .eq("org_id", invite.org_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingMember) {
      // Clean up invite and return success
      await adminClient.from("org_invites").delete().eq("id", inviteId);
      return new Response(
        JSON.stringify({ success: true, orgId: invite.org_id, alreadyMember: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Add member
    const { error: memberErr } = await adminClient
      .from("org_members")
      .insert({ org_id: invite.org_id, user_id: userId, role: invite.role });

    if (memberErr) throw new Error(`Failed to add member: ${memberErr.message}`);

    // Delete invite
    await adminClient.from("org_invites").delete().eq("id", inviteId);

    console.log(`[ACCEPT-INVITE] User ${userId} joined org ${invite.org_id} as ${invite.role}`);

    return new Response(
      JSON.stringify({ success: true, orgId: invite.org_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ACCEPT-INVITE] Error: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
