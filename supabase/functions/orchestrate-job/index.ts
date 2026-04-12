import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ───────── Cost table ─────────
const COSTS: Record<string, Record<string, number>> = {
  protein_prediction: { "ESMFold": 50, _default: 50 },
  docking: { "AutoDock Vina": 25, "Vina": 25, "Glide SP": 25, _default: 25 },
  synbio: { _default: 20 },
  crispr: { _default: 30 },
};

function calcCost(wf: string, variant: string): number {
  return COSTS[wf]?.[variant] ?? COSTS[wf]?._default ?? 50;
}

// ───────── Retention days per tier ─────────
const RETENTION_DAYS: Record<string, number> = {
  free: 7,
  starter: 30,
  professional: 90,
  elite: 365,
};

function expiresAt(tier: string | null): string {
  const days = RETENTION_DAYS[tier || "free"] ?? 7;
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

// ───────── Retry helper ─────────
async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 404) return r;
    } catch {
      if (i === retries) throw new Error(`Network error fetching ${url}`);
    }
  }
  throw new Error(`Failed after ${retries + 1} attempts: ${url}`);
}

// ───────── Enrichment ─────────
async function enrichProteinSequence(seq: string): Promise<string> {
  const trimmed = seq.trim();
  if (/^[A-Z][A-Z0-9]{4,9}$/i.test(trimmed)) {
    const r = await fetchWithRetry(`https://rest.uniprot.org/uniprotkb/${encodeURIComponent(trimmed)}.fasta`);
    if (r.status === 404) throw new Error(`UniProt ID "${trimmed}" not found`);
    return await r.text();
  }
  return seq;
}

async function enrichReceptor(receptor: string): Promise<string> {
  const trimmed = receptor.trim();
  if (/^\d[A-Za-z0-9]{3}$/.test(trimmed)) {
    const r = await fetchWithRetry(`https://files.rcsb.org/download/${trimmed.toUpperCase()}.pdb`);
    if (r.status === 404) throw new Error(`PDB ID "${trimmed}" not found`);
  }
  return receptor;
}

interface PubChemResult { smiles: string; molecularWeight: number }

async function enrichLigand(ligand: string): Promise<PubChemResult | null> {
  const trimmed = ligand.trim();
  if (/[()=#@\[\]]/.test(trimmed)) return null;
  if (trimmed.length < 2) return null;
  try {
    const base = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
    const r1 = await fetchWithRetry(`${base}/compound/name/${encodeURIComponent(trimmed)}/cids/JSON`);
    if (r1.status === 404) return null;
    const d1 = await r1.json();
    const cid = d1?.IdentifierList?.CID?.[0];
    if (!cid) return null;
    const r2 = await fetchWithRetry(`${base}/compound/cid/${cid}/property/CanonicalSMILES,MolecularWeight/JSON`);
    if (!r2.ok) return null;
    const d2 = await r2.json();
    const p = d2?.PropertyTable?.Properties?.[0];
    return p ? { smiles: p.CanonicalSMILES, molecularWeight: p.MolecularWeight } : null;
  } catch {
    return null;
  }
}

// RunPod removed — all processing handled by process-workflow edge function

// ───────── In-memory rate limiter ─────────
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 jobs per minute per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return true;
}

// ───────── Main handler ─────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // Rate limit
    if (!checkRateLimit(user.id)) {
      return json({ error: "Too many requests. Please wait before submitting more jobs." }, 429);
    }

    // Parse & validate
    const body = await req.json();
    const { workflowType } = body;
    if (!["protein_prediction", "docking", "synbio", "crispr"].includes(workflowType)) {
      return json({ error: "Invalid workflowType" }, 400);
    }

    // CRISPR jobs are handled by the crispr-analysis edge function directly, not orchestrate-job
    if (workflowType === "crispr") {
      return json({ error: "CRISPR jobs should be submitted via the crispr-analysis function directly" }, 400);
    }

    // ── Step 1: Validate per-workflow fields ──
    if (workflowType === "protein_prediction" && !body.sequence?.trim()) return json({ error: "sequence is required" }, 400);
    if (workflowType === "docking" && !body.receptor?.trim()) return json({ error: "receptor is required" }, 400);
    if (workflowType === "synbio" && (!body.sequence?.trim() || !body.name?.trim())) return json({ error: "sequence and name are required" }, 400);

    // ── Step 2: Calculate cost ──
    const variant = body.model || body.engine || "_default";
    const cost = calcCost(workflowType, variant);

    // ── Step 3: Resolve org — prefer client-supplied orgId, fall back to user_org_id ──
    let orgId: string | null = body.orgId || null;
    if (orgId) {
      // Validate that user is actually a member of this org
      const { data: membership } = await admin.from("org_members").select("id").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
      if (!membership) {
        return json({ error: "You are not a member of this organization" }, 403);
      }
    } else {
      const { data: orgRow } = await admin.rpc("user_org_id", { _user_id: user.id });
      orgId = orgRow as unknown as string | null;
    }
    if (!orgId) return json({ error: "User has no organization" }, 403);

    const { data: creditRow } = await admin.from("org_credits").select("balance").eq("org_id", orgId).single();
    if (!creditRow) return json({ error: "No credit record found" }, 403);
    if (creditRow.balance < cost) {
      return json({ error: "Insufficient credits", required: cost, available: creditRow.balance }, 402);
    }

    // ── Resolve subscription tier for retention ──
    let orgTier: string | null = null;
    try {
      const { data: org } = await admin.from("organizations").select("stripe_customer_id").eq("id", orgId).single();
      if (org?.stripe_customer_id) {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (stripeKey) {
          const { default: Stripe } = await import("https://esm.sh/stripe@18.5.0");
          const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
          const subs = await stripe.subscriptions.list({ customer: org.stripe_customer_id, status: "active", limit: 1 });
          if (subs.data.length > 0) {
            const productId = subs.data[0].items.data[0]?.price?.product as string;
            const PRODUCT_TIERS: Record<string, string> = {
              prod_UGuVgbRHstr711: "starter",
              prod_UGuV9iaW3l9RXI: "professional",
              prod_UGuWkOD0CWsOQ6: "elite",
            };
            orgTier = PRODUCT_TIERS[productId] || null;
          }
        }
      }
    } catch (e) {
      console.log("[orchestrate] Could not resolve tier, defaulting to free:", e);
    }
    const jobExpiresAt = expiresAt(orgTier);

    // ── Step 4: Deduct credits via secure SECURITY DEFINER function ──
    const { data: newBalance, error: deductErr } = await admin.rpc("deduct_credits_for_job", { _org_id: orgId, _cost: cost });
    if (deductErr) return json({ error: deductErr.message || "Failed to deduct credits" }, 500);

    let recordId: string | null = null;
    let jobNumber: number | null = null;

    try {
      // ── Step 5: Enrich input ──
      if (workflowType === "protein_prediction") {
        body.sequence = await enrichProteinSequence(body.sequence);
      } else if (workflowType === "docking") {
        await enrichReceptor(body.receptor);
        const ligandInfo = await enrichLigand(body.ligands || "");
        if (ligandInfo) body._ligandSmiles = ligandInfo.smiles;
      }

      // ── Step 6: Save job as QUEUED (no inline processing) ──
      if (workflowType === "protein_prediction") {
        const { data: rec, error } = await admin.from("protein_prediction_jobs").insert({
          user_id: user.id,
          name: body.name?.trim() || body.sequence.split("\n")[0]?.replace(">", "").trim() || "Protein",
          sequence: body.sequence,
          model: body.model || "ESMFold",
           gpu_type: "Cloud",
          priority: body.priority || "Normal",
          status: "queued",
          progress: 0,
          estimated_credits: cost,
          eta: "~2 min",
          expires_at: jobExpiresAt,
        }).select().single();
        if (error) throw new Error(`DB insert failed: ${error.message}`);
        recordId = rec.id;
        jobNumber = rec.job_number;

        // Job will be processed by job-worker / process-workflow

      } else if (workflowType === "docking") {
        const engine = body.engine || "AutoDock Vina";
        const { data: rec, error } = await admin.from("docking_jobs").insert({
          user_id: user.id,
          receptor: body.receptor,
          ligands: body.ligands || "Custom",
          ligand_mode: body.ligand_mode || "single",
          binding_site: body.binding_site || "Auto-detect pocket",
          engine,
          gpu_type: "Cloud",
          priority: body.priority || "Normal",
          status: "queued",
          progress: 0,
          estimated_credits: cost,
          eta: engine === "AutoDock Vina" ? "~5 min" : "~15 min",
          receptor_file_url: body.receptor_file_url || null,
          ligand_file_url: body.ligand_file_url || null,
          expires_at: jobExpiresAt,
        }).select().single();
        if (error) throw new Error(`DB insert failed: ${error.message}`);
        recordId = rec.id;
        jobNumber = rec.job_number;

        // Job will be processed by job-worker / process-workflow

      } else {
        const { data: rec, error } = await admin.from("synbio_designs").insert({
          user_id: user.id,
          name: body.name,
          sequence_type: body.sequence_type || "DNA",
          sequence: body.sequence,
          plasmid_type: body.plasmid_type || "circular",
          assembly_method: body.assembly_method || "Gibson Assembly",
          host_organism: body.host_organism || "E. coli",
          optimization_organism: body.optimization_organism || "E. coli (K12)",
          features: body.features || null,
          expires_at: jobExpiresAt,
        }).select().single();
        if (error) throw new Error(`DB insert failed: ${error.message}`);
        recordId = rec.id;

        // SynBio doesn't need special compute — worker handles computation
      }

      // ── Step 7: Log usage ──
      await admin.from("usage_logs").insert({
        org_id: orgId,
        user_id: user.id,
        credits_used: cost,
        description: `${workflowType} job${jobNumber ? ` #${jobNumber}` : ""}`,
      });

      // Return immediately — worker/RunPod will process the job
      return json({
        success: true,
        recordId,
        jobNumber,
        workflowType,
        creditsCost: cost,
        remainingCredits: newBalance ?? (creditRow.balance - cost),
        status: "queued",
      });

    } catch (processingError) {
      // Rollback credits on failure via secure function
      await admin.rpc("adjust_credits", { _org_id: orgId, _amount: cost });

      if (recordId) {
        if (workflowType === "protein_prediction") {
          await admin.from("protein_prediction_jobs").update({ status: "failed", progress: 0, error_message: (processingError as Error).message }).eq("id", recordId);
        } else if (workflowType === "docking") {
          await admin.from("docking_jobs").update({ status: "failed", progress: 0, error_message: (processingError as Error).message }).eq("id", recordId);
        }
      }

      return json({ error: `Processing failed: ${(processingError as Error).message}` }, 500);
    }
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
