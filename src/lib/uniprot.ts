export async function fetchProteinFromUniProt(uniprotId: string): Promise<string> {
  const id = uniprotId.trim();
  if (!id) throw new Error("UniProt ID is required");

  const res = await fetch(`https://rest.uniprot.org/uniprotkb/${encodeURIComponent(id)}.fasta`);

  if (res.status === 404) throw new Error(`Protein "${id}" not found on UniProt`);
  if (!res.ok) throw new Error(`UniProt request failed (${res.status})`);

  const fasta = await res.text();
  if (!fasta.startsWith(">")) throw new Error("Invalid FASTA response from UniProt");

  return fasta;
}
