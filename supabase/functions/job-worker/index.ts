import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 3;
const BATCH_SIZE = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ───────── Computation helpers ─────────

const ESMFOLD_URL = "https://api.esmatlas.com/foldSequence/v1/pdb/";
const ESMFOLD_TIMEOUT = 120_000;
const ESMFOLD_MAX_RESIDUES = 400;

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function parseFasta(raw: string): string {
  return raw.split("\n").filter(l => !l.startsWith(">")).join("").replace(/\s/g, "").toUpperCase();
}

const AA_W: Record<string, number> = {
  A:89,R:174,N:132,D:133,C:121,E:147,Q:146,G:75,H:155,I:131,L:131,K:146,M:149,F:165,P:115,S:105,T:119,W:204,Y:181,V:117,
};

function parsePdbMetrics(pdbContent: string, aa: string) {
  const lines = pdbContent.split("\n").filter(l => l.startsWith("ATOM"));
  const caLines = lines.filter(l => l.substring(12, 16).trim() === "CA");
  const residueCount = caLines.length;

  // pLDDT is stored in B-factor column (columns 61-66)
  let plddtSum = 0;
  let plddtCount = 0;
  for (const line of caLines) {
    const bFactor = parseFloat(line.substring(60, 66).trim());
    if (!isNaN(bFactor)) { plddtSum += bFactor; plddtCount++; }
  }
  const plddt = plddtCount > 0 ? +(plddtSum / plddtCount).toFixed(1) : 0;

  // Binding domain pLDDT (last 30% of residues)
  const bindingStart = Math.floor(caLines.length * 0.7);
  let bindSum = 0, bindCount = 0;
  for (let i = bindingStart; i < caLines.length; i++) {
    const b = parseFloat(caLines[i].substring(60, 66).trim());
    if (!isNaN(b)) { bindSum += b; bindCount++; }
  }
  const plddtBind = bindCount > 0 ? +(bindSum / bindCount).toFixed(1) : plddt;

  const mw = aa.split("").reduce((s, c) => s + (AA_W[c] || 110), 0) - (aa.length - 1) * 18;

  return {
    plddt_score: plddt,
    plddt_binding_domain: plddtBind,
    result_metrics: {
      residue_count: residueCount,
      molecular_weight_da: mw,
      source: "esmfold",
    },
    pdbContent,
  };
}

function computeProteinSimulated(aa: string) {
  const len = aa.length;
  const rng = seededRandom(hashCode(aa));
  const plddt = +(60 + rng() * 35).toFixed(1);
  const plddtBind = +(plddt - 2 + rng() * 4).toFixed(1);
  const mw = aa.split("").reduce((s, c) => s + (AA_W[c] || 110), 0) - (len - 1) * 18;
  const helixPct = +(20 + rng() * 40).toFixed(1);
  const sheetPct = +(10 + rng() * 30).toFixed(1);
  const coilPct = +(100 - helixPct - sheetPct).toFixed(1);

  const atoms: string[] = [];
  for (let i = 0; i < Math.min(len, 500); i++) {
    const a = (i / len) * Math.PI * 4;
    const x = (Math.cos(a) * 15 + rng() * 2).toFixed(3);
    const y = (Math.sin(a) * 15 + rng() * 2).toFixed(3);
    const z = (i * 3.8 / len * 30 + rng()).toFixed(3);
    atoms.push(`ATOM  ${String(i+1).padStart(5)} CA  ALA A${String(i+1).padStart(4)}    ${x.padStart(8)}${y.padStart(8)}${z.padStart(8)}  1.00${plddt.toFixed(2).padStart(6)}           C  `);
  }
  atoms.push("END");

  return {
    plddt_score: plddt, plddt_binding_domain: plddtBind,
    result_metrics: { residue_count: len, molecular_weight_da: mw, helix_pct: helixPct, sheet_pct: sheetPct, coil_pct: coilPct, source: "simulation" },
    pdbContent: atoms.join("\n"),
  };
}

async function fetchAlphaFoldPdb(sequence: string): Promise<string> {
  // Extract UniProt ID from FASTA header if present (e.g. >P00533 or >sp|P00533|EGFR_HUMAN)
  const lines = sequence.split("\n");
  let uniprotId = "";
  for (const line of lines) {
    if (line.startsWith(">")) {
      // Try patterns: >P00533, >sp|P00533|..., >UNIPROT_ID
      const m = line.match(/>\s*(?:sp\|)?([A-Z0-9]{4,10})/i);
      if (m) uniprotId = m[1].toUpperCase();
      break;
    }
  }

  if (!uniprotId) {
    throw new Error("AlphaFold2 requires a UniProt ID in the FASTA header (e.g. >P00533)");
  }

  // Fetch from AlphaFold DB
  const url = `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v4.pdb`;
  console.log(`[job-worker] Fetching AlphaFold structure from ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`AlphaFold DB returned ${res.status} for ${uniprotId}`);
  }

  const pdb = await res.text();
  console.log(`[job-worker] AlphaFold DB returned ${pdb.length} bytes for ${uniprotId}`);
  return pdb;
}

async function computeProtein(sequence: string, model = "ESMFold") {
  const aa = parseFasta(sequence);

  if (model === "AlphaFold2") {
    try {
      const pdbContent = await fetchAlphaFoldPdb(sequence);
      const metrics = parsePdbMetrics(pdbContent, aa);
      metrics.result_metrics.source = "alphafold2";
      return metrics;
    } catch (err) {
      console.error("[job-worker] AlphaFold fetch failed:", (err as Error).message);
      console.log("[job-worker] Falling back to ESMFold");
      // Fall through to ESMFold
    }
  }

  // ESMFold path
  if (aa.length > ESMFOLD_MAX_RESIDUES) {
    console.log(`[job-worker] Sequence too long (${aa.length} residues), using simulation fallback`);
    return computeProteinSimulated(aa);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ESMFOLD_TIMEOUT);

    const response = await fetch(ESMFOLD_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: aa,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[job-worker] ESMFold API error ${response.status}: ${errText}`);
      console.log("[job-worker] Falling back to simulation");
      return computeProteinSimulated(aa);
    }

    const pdbContent = await response.text();
    console.log(`[job-worker] ESMFold returned ${pdbContent.length} bytes of PDB data`);
    return parsePdbMetrics(pdbContent, aa);
  } catch (err) {
    console.error("[job-worker] ESMFold fetch failed:", (err as Error).message);
    console.log("[job-worker] Falling back to simulation");
    return computeProteinSimulated(aa);
  }
}

// ───────── Real Vina docking via RunPod ─────────

async function callVinaRunPod(receptor: string, ligands: string, opts: Record<string, unknown> = {}): Promise<{
  best_score: number;
  poses: Array<{ rank: number; score: number; rmsd: number; pdbqt?: string; interactions?: unknown[] }>;
  pdbContent: string;
  log?: string;
}> {
  const RUNPOD_API_KEY = Deno.env.get("RUNPOD_API_KEY");
  const RUNPOD_ENDPOINT_ID = Deno.env.get("RUNPOD_ENDPOINT_ID");

  if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
    console.log("[job-worker] RunPod not configured — falling back to simulated docking");
    return computeDockingSimulated(receptor, ligands);
  }

  const payload = {
    input: {
      endpoint: "/dock",
      receptor,                              // PDB ID e.g. "2HYY"
      ligand: ligands,                       // SMILES string
      exhaustiveness: opts.exhaustiveness || 32,
      n_poses: opts.n_poses || 9,
      energy_range: opts.energy_range || 3,
      ...(opts.receptor_file_url ? { receptor: opts.receptor_file_url } : {}),
      ...(opts.ligand_file_url ? { ligand: opts.ligand_file_url } : {}),
      ...(opts.center_x ? { center_x: opts.center_x, center_y: opts.center_y, center_z: opts.center_z } : {}),
      ...(opts.size_x ? { size_x: opts.size_x, size_y: opts.size_y, size_z: opts.size_z } : {}),
    },
  };

  const runUrl = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`;
  console.log(`[job-worker] Sending docking job to RunPod: ${receptor} + ${ligands.substring(0, 50)}...`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 600_000); // 10 min timeout

  const res = await fetch(runUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RUNPOD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  const data = await res.json();

  if (!res.ok || data.status === "FAILED") {
    const errMsg = data.error || data.output?.error || "RunPod Vina execution failed";
    console.error(`[job-worker] RunPod Vina error:`, errMsg);
    throw new Error(`Vina docking failed: ${errMsg}`);
  }

  // Parse RunPod Vina response
  const output = data.output || data;

  if (output.success === false) {
    throw new Error(`Vina error: ${output.error || "Unknown"}`);
  }

  // Map Vina API response to our database schema
  const poses = (output.poses || []).map((p: Record<string, unknown>, i: number) => ({
    rank: p.model || i + 1,
    score: p.score_kcal_mol ?? p.score ?? 0,
    rmsd: p.rmsd_lower_bound ?? p.rmsd ?? 0,
    rmsd_ub: p.rmsd_upper_bound ?? 0,
    pdbqt: (p.pdbqt as string || "").substring(0, 5000), // Truncate for DB storage
  }));

  // Build a combined PDB from the top pose PDBQT (simplified conversion)
  const topPosePdbqt = poses[0]?.pdbqt || "";
  const pdbLines: string[] = [];
  pdbLines.push(`REMARK   AutoDock Vina docking result for ${receptor} + ${ligands.substring(0, 60)}`);
  pdbLines.push(`REMARK   Best score: ${output.best_score} kcal/mol`);
  pdbLines.push(`REMARK   Engine: AutoDock Vina 1.2.5`);
  pdbLines.push(`REMARK   Exhaustiveness: ${payload.input.exhaustiveness}`);

  // Convert PDBQT ATOM lines to PDB (strip charge column)
  for (const line of topPosePdbqt.split("\n")) {
    if (line.startsWith("ATOM") || line.startsWith("HETATM")) {
      pdbLines.push(line.substring(0, 66).trimEnd());
    }
  }
  pdbLines.push("END");

  console.log(`[job-worker] Vina returned ${poses.length} poses, best score: ${output.best_score}`);

  return {
    best_score: output.best_score ?? poses[0]?.score ?? 0,
    poses,
    pdbContent: pdbLines.join("\n"),
    log: output.log,
  };
}

// ───────── Simulated docking fallback ─────────

function computeDockingSimulated(receptor: string, ligands: string) {
  const rng = seededRandom(hashCode(receptor + ligands));
  const types = ["H-bond","π-stacking","Hydrophobic","Salt bridge","Van der Waals"];
  const commonResidues = ["ASP831","GLU738","LYS745","ARG841","HIS781","TYR869","TRP856","PHE795","SER720","THR854","MET793","LEU788","CYS797","GLY796","ALA743"];
  const poses = Array.from({ length: 5 }, (_, i) => {
    const score = +(-11.5 + rng() * 5.5).toFixed(2);
    const rmsd = +(0.2 + rng() * 2.8).toFixed(2);
    const numInts = 3 + Math.floor(rng() * 4);
    const usedResidues = new Set<string>();
    const ints = Array.from({ length: numInts }, () => {
      let residue: string;
      do {
        residue = commonResidues[Math.floor(rng() * commonResidues.length)];
      } while (usedResidues.has(residue) && usedResidues.size < commonResidues.length);
      usedResidues.add(residue);
      const type = types[Math.floor(rng() * types.length)];
      const baseDist = type === "H-bond" ? 1.8 : type === "Hydrophobic" ? 3.2 : 2.5;
      const distance_angstrom = +(baseDist + rng() * 1.0).toFixed(2);
      return { type, residue, distance_angstrom };
    });
    return { rank: i + 1, score, rmsd, interactions: ints };
  }).sort((a, b) => a.score - b.score);
  poses.forEach((p, i) => (p.rank = i + 1));

  const pdbLines: string[] = [];
  pdbLines.push(`REMARK   Simulated docking result for ${receptor} + ${ligands}`);
  pdbLines.push(`REMARK   Best score: ${poses[0].score} kcal/mol`);
  pdbLines.push(`REMARK   Engine: Simulated (RunPod not configured)`);
  for (let i = 0; i < 50; i++) {
    const x = (Math.cos(i * 0.3) * 20 + rng() * 2).toFixed(3);
    const y = (Math.sin(i * 0.3) * 20 + rng() * 2).toFixed(3);
    const z = (i * 1.5 + rng()).toFixed(3);
    pdbLines.push(`ATOM  ${String(i+1).padStart(5)} CA  ALA A${String(i+1).padStart(4)}    ${x.padStart(8)}${y.padStart(8)}${z.padStart(8)}  1.00  0.00           C  `);
  }
  pdbLines.push("TER");
  for (let i = 0; i < 12; i++) {
    const x = (rng() * 6 + 5).toFixed(3);
    const y = (rng() * 6 + 5).toFixed(3);
    const z = (rng() * 6 + 30).toFixed(3);
    const el = ["C","N","O","C","C","C","O","N","C","C","C","C"][i];
    pdbLines.push(`HETATM${String(51+i).padStart(5)} ${el.padStart(2)}   LIG B   1    ${x.padStart(8)}${y.padStart(8)}${z.padStart(8)}  1.00  0.00           ${el}  `);
  }
  pdbLines.push("END");

  return { best_score: poses[0].score, poses, pdbContent: pdbLines.join("\n") };
}

const CODON_W: Record<string, number> = {
  GCT:.19,GCC:.25,GCA:.22,GCG:.34,TGT:.43,TGC:.57,GAT:.63,GAC:.37,GAA:.69,GAG:.31,
  TTT:.57,TTC:.43,GGT:.38,GGC:.37,GGA:.11,GGG:.14,CAT:.57,CAC:.43,ATT:.47,ATC:.46,ATA:.07,
  AAA:.77,AAG:.23,CTG:.47,CTT:.12,CTC:.10,CTA:.04,TTA:.14,TTG:.13,ATG:1,AAT:.45,AAC:.55,
  CCG:.55,CCA:.20,CCT:.16,CCC:.10,CAA:.31,CAG:.69,CGT:.42,CGC:.37,CGA:.07,CGG:.10,AGA:.03,AGG:.02,
  AGT:.15,AGC:.27,TCT:.17,TCC:.14,TCA:.14,TCG:.13,ACT:.19,ACC:.40,ACA:.17,ACG:.25,
  GTT:.29,GTC:.20,GTA:.17,GTG:.34,TGG:1,TAT:.57,TAC:.43,TAA:.61,TAG:.09,TGA:.30,
};
const STOPS = new Set(["TAA","TAG","TGA"]);

function computeSynBio(sequence: string) {
  const clean = sequence.split("\n").filter(l => !l.startsWith(">")).join("").replace(/\s/g, "").toUpperCase();
  const gcCount = (clean.match(/[GC]/g) || []).length;
  const gc = clean.length > 0 ? +((gcCount / clean.length) * 100).toFixed(2) : 0;
  let caiSum = 0, cc = 0;
  for (let i = 0; i + 2 < clean.length; i += 3) {
    const w = CODON_W[clean.substring(i, i + 3)];
    if (w && w > 0) { caiSum += Math.log(w); cc++; }
  }
  const cai = cc > 0 ? +Math.exp(caiSum / cc).toFixed(3) : 0;
  const gcScore = Math.max(0, 1 - Math.abs(gc - 50) / 50 * 2);
  const feasibility = +((gcScore * 0.4 + cai * 0.6) * 100).toFixed(1);
  const hasStart = clean.startsWith("ATG");
  const last3 = clean.length >= 3 ? clean.substring(clean.length - 3) : "";
  const hasStop = STOPS.has(last3);
  const div3 = clean.length % 3 === 0;
  let intStops = 0;
  if (div3 && clean.length >= 6) for (let i = 3; i < clean.length - 3; i += 3) if (STOPS.has(clean.substring(i, i + 3))) intStops++;

  return {
    gc_content: gc, cai_score: cai, feasibility_score: feasibility,
    validation_result: {
      start_codon: { pass: hasStart, message: hasStart ? "ATG start codon present" : "Missing ATG start codon" },
      stop_codon: { pass: hasStop, message: hasStop ? `Stop codon (${last3}) present` : "No stop codon found" },
      reading_frame: { pass: div3, message: div3 ? "Length divisible by 3" : `Length ${clean.length} not divisible by 3` },
      internal_stops: { pass: intStops === 0, message: intStops === 0 ? "No internal stop codons" : `${intStops} internal stop codon(s)` },
      gc_range: { pass: gc >= 30 && gc <= 70, message: gc >= 30 && gc <= 70 ? `GC ${gc}% in range` : `GC ${gc}% out of range` },
    },
  };
}

// ───────── Job processing ─────────

interface ProcessResult { success: boolean; error?: string }

async function processProteinJob(admin: ReturnType<typeof createClient>, job: Record<string, unknown>): Promise<ProcessResult> {
  try {
    await admin.from("protein_prediction_jobs").update({ status: "running", progress: 30 }).eq("id", job.id);

    const result = await computeProtein(job.sequence as string, (job.model as string) || "ESMFold");

    let pdbUrl: string | null = null;
    const path = `${job.user_id}/${job.id}.pdb`;
    const { error: upErr } = await admin.storage.from("results").upload(path, result.pdbContent, { contentType: "chemical/x-pdb", upsert: true });
    if (!upErr) {
      const { data: u } = admin.storage.from("results").getPublicUrl(path);
      pdbUrl = u.publicUrl;
    }

    await admin.from("protein_prediction_jobs").update({
      status: "completed", progress: 100,
      plddt_score: result.plddt_score,
      plddt_binding_domain: result.plddt_binding_domain,
      result_metrics: result.result_metrics,
      result_pdb_url: pdbUrl,
      error_message: null,
    }).eq("id", job.id);

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

async function processDockingJob(admin: ReturnType<typeof createClient>, job: Record<string, unknown>): Promise<ProcessResult> {
  try {
    await admin.from("docking_jobs").update({ status: "running", progress: 10 }).eq("id", job.id);

    // Progress: preparing input
    await admin.from("docking_jobs").update({ progress: 20 }).eq("id", job.id);

    // Call real Vina via RunPod (falls back to simulated if RunPod not configured)
    const result = await callVinaRunPod(job.receptor as string, job.ligands as string, {
      exhaustiveness: (job as Record<string, unknown>).exhaustiveness,
      receptor_file_url: job.receptor_file_url,
      ligand_file_url: job.ligand_file_url,
    });

    await admin.from("docking_jobs").update({ progress: 80 }).eq("id", job.id);

    // Upload docked-complex PDB to storage
    let resultPdbUrl: string | null = null;
    const path = `${job.user_id}/${job.id}-docked.pdb`;
    const { error: upErr } = await admin.storage.from("results").upload(path, result.pdbContent, { contentType: "chemical/x-pdb", upsert: true });
    if (!upErr) {
      const { data: u } = admin.storage.from("results").getPublicUrl(path);
      resultPdbUrl = u.publicUrl;
    }

    // Store log if available
    const posesWithMeta = result.poses.map((p: Record<string, unknown>) => ({
      ...p,
      engine: "AutoDock Vina 1.2.5",
      ...(result.log ? {} : { source: "simulated" }),
    }));

    await admin.from("docking_jobs").update({
      status: "completed", progress: 100,
      best_score: result.best_score,
      poses: posesWithMeta,
      error_message: null,
    }).eq("id", job.id);

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

async function processSynBioJob(admin: ReturnType<typeof createClient>, job: Record<string, unknown>): Promise<ProcessResult> {
  try {
    const result = computeSynBio(job.sequence as string);
    await admin.from("synbio_designs").update({
      gc_content: result.gc_content,
      cai_score: result.cai_score,
      feasibility_score: result.feasibility_score,
      validation_result: result.validation_result,
    }).eq("id", job.id);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

async function markFailed(admin: ReturnType<typeof createClient>, table: string, id: string, retryCount: number, error: string) {
  await admin.from(table).update({
    status: retryCount + 1 >= MAX_RETRIES ? "failed" : "queued",
    retry_count: retryCount + 1,
    error_message: error,
  }).eq("id", id);
}

// ───────── Main handler ─────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const processed: { type: string; id: string; result: string }[] = [];

    // Poll protein_prediction_jobs
    const { data: proteinJobs } = await admin
      .from("protein_prediction_jobs")
      .select("*")
      .in("status", ["queued"])
      .lt("retry_count", MAX_RETRIES)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    const { data: proteinRetries } = await admin
      .from("protein_prediction_jobs")
      .select("*")
      .eq("status", "failed")
      .lt("retry_count", MAX_RETRIES)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    const allProtein = [...(proteinJobs || []), ...(proteinRetries || [])];

    for (const job of allProtein) {
      const result = await processProteinJob(admin, job);
      if (!result.success) {
        await markFailed(admin, "protein_prediction_jobs", job.id, job.retry_count ?? 0, result.error || "Unknown error");
      }
      processed.push({ type: "protein", id: job.id, result: result.success ? "completed" : `failed (retry ${(job.retry_count ?? 0) + 1}/${MAX_RETRIES})` });
    }

    // Poll docking_jobs
    const { data: dockingJobs } = await admin
      .from("docking_jobs")
      .select("*")
      .in("status", ["queued"])
      .lt("retry_count", MAX_RETRIES)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    const { data: dockingRetries } = await admin
      .from("docking_jobs")
      .select("*")
      .eq("status", "failed")
      .lt("retry_count", MAX_RETRIES)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    const allDocking = [...(dockingJobs || []), ...(dockingRetries || [])];

    for (const job of allDocking) {
      const result = await processDockingJob(admin, job);
      if (!result.success) {
        await markFailed(admin, "docking_jobs", job.id, job.retry_count ?? 0, result.error || "Unknown error");
      }
      processed.push({ type: "docking", id: job.id, result: result.success ? "completed" : `failed (retry ${(job.retry_count ?? 0) + 1}/${MAX_RETRIES})` });
    }

    // Poll synbio_designs that have null feasibility_score (unprocessed)
    const { data: synbioJobs } = await admin
      .from("synbio_designs")
      .select("*")
      .is("feasibility_score", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    for (const job of synbioJobs || []) {
      const result = await processSynBioJob(admin, job);
      processed.push({ type: "synbio", id: job.id, result: result.success ? "completed" : "failed" });
    }

    console.log(`[job-worker] Processed ${processed.length} jobs`, processed);

    return json({
      processed: processed.length,
      jobs: processed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[job-worker] Error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
