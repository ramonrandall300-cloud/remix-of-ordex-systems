import { corsFetch } from "@/lib/cors-proxy";

export async function fetchPDBStructure(pdbId: string): Promise<string> {
  const id = pdbId.trim().toUpperCase();
  if (!id) throw new Error("PDB ID is required");

  const res = await corsFetch(`https://files.rcsb.org/download/${encodeURIComponent(id)}.pdb`);

  if (res.status === 404) throw new Error(`PDB structure "${id}" not found on RCSB`);
  if (!res.ok) throw new Error(`RCSB request failed (${res.status})`);

  const pdb = await res.text();
  if (!pdb.includes("ATOM") && !pdb.includes("HETATM")) throw new Error("Invalid PDB file received");

  return pdb;
}
