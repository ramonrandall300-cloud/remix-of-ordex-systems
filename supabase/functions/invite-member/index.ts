import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    // Authenticate
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

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, role, orgId } = await req.json();
    if (!email || !orgId) throw new Error("email and orgId are required");
    const inviteRole = role || "member";

    // Verify caller is admin/owner
    const { data: callerMember } = await adminClient
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();

    if (!callerMember || !["admin", "owner"].includes(callerMember.role)) {
      throw new Error("Only admins can invite members");
    }

    // Check if user already a member
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const targetUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (targetUser) {
      const { data: existingMember } = await adminClient
        .from("org_members")
        .select("id")
        .eq("org_id", orgId)
        .eq("user_id", targetUser.id)
        .maybeSingle();

      if (existingMember) {
        throw new Error("This user is already a member of this organization");
      }
    }

    // Enforce seat limit: count current members vs paid seats
    const { count: memberCount } = await adminClient
      .from("org_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    // Get seat count from subscription_cache
    const { data: subCache } = await adminClient
      .from("subscription_cache")
      .select("seat_count")
      .eq("org_id", orgId)
      .maybeSingle();

    const paidSeats = subCache?.seat_count ?? 0;
    const currentMembers = memberCount ?? 0;

    // Also count pending invites toward the limit
    const { count: pendingCount } = await adminClient
      .from("org_invites")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gt("expires_at", new Date().toISOString());

    const totalCommitted = currentMembers + (pendingCount ?? 0);

    if (paidSeats > 0 && totalCommitted >= paidSeats) {
      throw new Error(
        `All ${paidSeats} seats are in use (${currentMembers} members, ${pendingCount ?? 0} pending invites). Purchase more seats to invite additional members.`
      );
    }

    // Check for existing pending invite
    const { data: existingInvite } = await adminClient
      .from("org_invites")
      .select("id")
      .eq("org_id", orgId)
      .eq("email", email.toLowerCase())
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      throw new Error("An invite is already pending for this email");
    }

    // Get org name
    const { data: org } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();

    const orgName = org?.name || "ORDEX Systems";

    // Create invite record
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: invite, error: inviteErr } = await adminClient
      .from("org_invites")
      .insert({
        org_id: orgId,
        email: email.toLowerCase(),
        role: inviteRole,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (inviteErr) throw new Error(`Failed to create invite: ${inviteErr.message}`);

    // Send email via Resend through gateway
    const siteUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "")
      ? "https://id-preview--253c0952-e8dd-4e09-aa57-991eb19f1856.lovable.app"
      : "https://ordexsystems.com";

    const inviteLink = `${siteUrl}/en/auth?invite=${invite.id}`;
    const inviterName = userData.user.user_metadata?.full_name || userData.user.email;

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Inter', Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0;">
  <div style="max-width: 480px; margin: 0 auto; padding: 32px 28px;">
    <h1 style="font-size: 24px; font-weight: bold; color: #0f172a; margin: 0 0 20px;">You've been invited</h1>
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 20px;">
      <strong>${inviterName}</strong> has invited you to join
      <strong>${orgName}</strong> on ORDEX Systems as a <strong>${inviteRole}</strong>.
    </p>
    <a href="${inviteLink}" style="display: inline-block; background-color: #26b5a0; color: #0f172a; font-weight: bold; font-size: 15px; border-radius: 8px; padding: 12px 24px; text-decoration: none;">
      Accept Invitation
    </a>
    <p style="font-size: 12px; color: #94a3b8; margin: 30px 0 0;">
      This invitation expires in 7 days. If you weren't expecting this, you can safely ignore it.
    </p>
  </div>
</body>
</html>`;

    const emailResponse = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "ORDEX Systems <noreply@ordex-systems.com>",
        to: [email],
        subject: `You've been invited to ${orgName}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();
    if (!emailResponse.ok) {
      console.error("[INVITE] Email send failed:", emailData);
      // Don't throw - invite is still created, email just failed
    }

    console.log(`[INVITE] Invite ${invite.id} created for ${email} to org ${orgId}`);

    return new Response(
      JSON.stringify({ success: true, inviteId: invite.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[INVITE] Error: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
