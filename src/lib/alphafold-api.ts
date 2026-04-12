import { corsFetch } from "@/lib/cors-proxy";

const BASE = "https://alphafold.ebi.ac.uk/api";
const FILES_BASE = "https://alphafold.ebi.ac.uk/files";

/* ---------- Types ---------- */

export interface AlphaFoldModel {
  entryId: string;
  gene: string;
  uniprotAccession: string;
  uniprotId: string;
  uniprotDescription: string;
  taxId: number;
  organismScientificName: string;
  uniprotStart: number;
  uniprotEnd: number;
  uniprotSequence: string;
  modelCreatedDate: string;
  latestVersion: number;
  allVersions: number[];
  isReviewed: boolean;
  isReferenceProteome: boolean;
  cifUrl: string;
  bcifUrl: string;
  pdbUrl: string;
  paeDocUrl: string;
  paeImageUrl: string;
  amAnnotationsUrl?: string;
  amAnnotationsHgUrl?: string;
}

export interface UniprotSummary {
  uniprot_entry: {
    ac: string;
    id: string;
    sequence_length: number;
  };
  structures: Array<{
    summary: {
      model_identifier: string;
      model_category: string;
      provider: string;
      created: string;
      sequence_identity: number;
      uniprot_start: number;
      uniprot_end: number;
      coverage: number;
      model_url: string;
      model_format: string;
      model_page_url: string;
      confidence_type: string;
      confidence_avg_local_score: number;
    };
  }>;
}

export interface Annotation {
  type: string;
  description: string;
  start: number;
  end: number;
  evidence?: Array<{ source: string; id: string }>;
}

export interface ProteinBundle {
  prediction: AlphaFoldModel[];
  summary: UniprotSummary | null;
  annotations: Annotation[];
}

/* ---------- Helpers ---------- */

async function fetchJson<T>(url: string): Promise<T> {
  const res = await corsFetch(url);
  if (res.status === 404) throw new Error(`Not found: ${url}`);
  if (!res.ok) throw new Error(`AlphaFold API error (${res.status})`);
  return res.json();
}

/* ---------- Public API ---------- */

/**
 * Get all predicted models for a UniProt accession (e.g. "P00533").
 */
export async function getPrediction(qualifier: string): Promise<AlphaFoldModel[]> {
  return fetchJson<AlphaFoldModel[]>(`${BASE}/prediction/${encodeURIComponent(qualifier)}`);
}

/**
 * Get complex details for a UniProt accession or model ID.
 */
export async function getComplex(qualifier: string) {
  return fetchJson<unknown>(`${BASE}/complex/${encodeURIComponent(qualifier)}`);
}

/**
 * Get UniProt summary (3D-Beacons format) for a given accession.
 */
export async function getUniprotSummary(qualifier: string): Promise<UniprotSummary> {
  return fetchJson<UniprotSummary>(`${BASE}/uniprot/summary/${encodeURIComponent(qualifier)}.json`);
}

/**
 * Get all annotations for a UniProt accession.
 */
export async function getAnnotations(qualifier: string): Promise<Annotation[]> {
  return fetchJson<Annotation[]>(`${BASE}/annotations/${encodeURIComponent(qualifier)}.json`);
}

/**
 * Fetch prediction + summary + annotations in parallel.
 */
export async function getProteinBundle(qualifier: string): Promise<ProteinBundle> {
  const [prediction, summary, annotations] = await Promise.allSettled([
    getPrediction(qualifier),
    getUniprotSummary(qualifier),
    getAnnotations(qualifier),
  ]);

  return {
    prediction: prediction.status === "fulfilled" ? prediction.value : [],
    summary: summary.status === "fulfilled" ? summary.value : null,
    annotations: annotations.status === "fulfilled" ? annotations.value : [],
  };
}

/**
 * Build a direct URL to an AlphaFold structure file (CIF or PDB).
 * Works for single-chain predictions: AF-{accession}-F1-model_v4
 */
export function buildStructureUrl(
  uniprotAccession: string,
  format: "cif" | "pdb" = "cif",
  version = 6,
): string {
  const ext = format === "cif" ? "cif" : "pdb";
  return `${FILES_BASE}/AF-${uniprotAccession}-F1-model_v${version}.${ext}`;
}
