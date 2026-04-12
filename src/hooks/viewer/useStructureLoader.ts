import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { corsFetch } from "@/lib/cors-proxy";

/* ── Fetch helpers ── */

async function fetchRCSB(id: string): Promise<{ data: string; format: string }> {
  const clean = id.trim().toUpperCase();
  if (!clean) throw new Error("PDB ID is required");
  const pdbRes = await corsFetch("https://files.rcsb.org/download/" + clean + ".pdb");
  if (pdbRes.ok) {
    const text = await pdbRes.text();
    if (text.includes("ATOM") || text.includes("HETATM")) return { data: text, format: "pdb" };
  }
  const cifRes = await corsFetch("https://files.rcsb.org/download/" + clean + ".cif");
  if (cifRes.ok) {
    const text = await cifRes.text();
    return { data: text, format: "cif" };
  }
  throw new Error('Structure "' + clean + '" not found on RCSB');
}

async function fetchAlphaFold(uniprotId: string): Promise<{ data: string; format: string; name: string }> {
  const clean = uniprotId.trim().toUpperCase();
  if (!clean) throw new Error("UniProt ID is required");
  const apiRes = await corsFetch("https://alphafold.ebi.ac.uk/api/prediction/" + clean);
  if (!apiRes.ok) throw new Error('AlphaFold prediction not found for "' + clean + '"');
  const predictions = await apiRes.json();
  const entry = Array.isArray(predictions) ? predictions[0] : predictions;
  if (!entry || !entry.pdbUrl) throw new Error("No PDB URL in AlphaFold response");
  const pdbRes = await corsFetch(entry.pdbUrl);
  if (!pdbRes.ok) throw new Error("Failed to download AlphaFold structure");
  const data = await pdbRes.text();
  return { data, format: "pdb", name: entry.uniprotDescription || entry.gene || clean };
}

/* ── Hook ── */

export interface StructureState {
  pdbData: string | null;
  pdbFormat: string;
  structureName: string;
  structureInfo: { atoms?: number; residues?: number; chains?: string[] } | null;
  loading: boolean;
}

export function useStructureLoader() {
  const [pdbData, setPdbData] = useState<string | null>(null);
  const [pdbFormat, setPdbFormat] = useState("pdb");
  const [structureName, setStructureName] = useState("");
  const [structureInfo, setStructureInfo] = useState<StructureState["structureInfo"]>(null);
  const [loading, setLoading] = useState(false);

  const parseInfo = useCallback((data: string) => {
    const lines = data.split("\n");
    const atomLines = lines.filter((l) => l.startsWith("ATOM") || l.startsWith("HETATM"));
    const residueSet = new Set<string>();
    const chainSet = new Set<string>();
    atomLines.forEach((l) => {
      const chain = l.substring(21, 22).trim();
      const resSeq = l.substring(22, 27).trim();
      if (chain) chainSet.add(chain);
      if (resSeq) residueSet.add(chain + "_" + resSeq);
    });
    setStructureInfo({ atoms: atomLines.length, residues: residueSet.size, chains: Array.from(chainSet) });
  }, []);

  const loadRCSB = useCallback(async (pdbId: string) => {
    if (!pdbId.trim()) return;
    setLoading(true);
    try {
      const result = await fetchRCSB(pdbId);
      setPdbData(result.data);
      setPdbFormat(result.format);
      setStructureName(pdbId.trim().toUpperCase());
      parseInfo(result.data);
      toast.success("Loaded " + pdbId.trim().toUpperCase() + " from RCSB");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [parseInfo]);

  const loadAlphaFold = useCallback(async (uniprotId: string) => {
    if (!uniprotId.trim()) return;
    setLoading(true);
    try {
      const result = await fetchAlphaFold(uniprotId);
      setPdbData(result.data);
      setPdbFormat(result.format);
      setStructureName(result.name);
      parseInfo(result.data);
      toast.success("Loaded AlphaFold prediction for " + uniprotId.trim().toUpperCase());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [parseInfo]);

  const loadFile = useCallback((file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target ? (ev.target.result as string) : "";
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdb";
      setPdbData(text);
      setPdbFormat(ext === "cif" || ext === "mmcif" ? "cif" : "pdb");
      setStructureName(file.name);
      parseInfo(text);
      setLoading(false);
      toast.success("Loaded " + file.name);
    };
    reader.onerror = () => {
      setLoading(false);
      toast.error("Failed to read file");
    };
    reader.readAsText(file);
  }, [parseInfo]);

  const loadFromJob = useCallback(async (job: any) => {
    setLoading(true);
    try {
      let pdbText = "";
      if (job?.user_id && job?.id) {
        const storagePath = job.user_id + "/" + job.id + ".pdb";
        const dl = await supabase.storage.from("results").download(storagePath);
        if (!dl.error && dl.data) pdbText = await dl.data.text();
      }
      if (!pdbText && job?.result_pdb_url) {
        const parts = job.result_pdb_url.split("results/");
        if (parts.length >= 2) {
          const fallbackPath = decodeURIComponent(parts[parts.length - 1]);
          const signed = await supabase.storage.from("results").createSignedUrl(fallbackPath, 300);
          if (!signed.error && signed.data?.signedUrl) {
            const resp = await fetch(signed.data.signedUrl);
            if (!resp.ok) throw new Error("Failed to fetch result");
            pdbText = await resp.text();
          }
        }
      }
      if (!pdbText) throw new Error("Failed to fetch result");
      setPdbData(pdbText);
      setPdbFormat("pdb");
      setStructureName(job?.name || "Completed job");
      parseInfo(pdbText);
      toast.success("Loaded " + (job?.name || "completed job"));
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch result");
    } finally {
      setLoading(false);
    }
  }, [parseInfo]);

  return {
    pdbData, pdbFormat, structureName, structureInfo, loading,
    loadRCSB, loadAlphaFold, loadFile, loadFromJob,
  };
}
