export interface PubChemCompound {
  cid: number;
  smiles: string;
  iupacName: string;
  molecularFormula: string;
  molecularWeight: number;
  exactMass: number;
  xlogp: number | null;
  hbondDonor: number;
  hbondAcceptor: number;
  rotatableBonds: number;
  tpsa: number;
}

export async function fetchCompoundFromPubChem(name: string): Promise<PubChemCompound> {
  const q = encodeURIComponent(name.trim());
  if (!q) throw new Error("Compound name is required");

  const base = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

  // Resolve name → CID
  const cidRes = await fetch(`${base}/compound/name/${q}/cids/JSON`);
  if (cidRes.status === 404) throw new Error(`Compound "${name}" not found on PubChem`);
  if (!cidRes.ok) throw new Error(`PubChem CID lookup failed (${cidRes.status})`);
  const cidData = await cidRes.json();
  const cid: number = cidData?.IdentifierList?.CID?.[0];
  if (!cid) throw new Error(`No CID returned for "${name}"`);

  // Fetch properties
  const props = [
    "CanonicalSMILES", "IUPACName", "MolecularFormula", "MolecularWeight",
    "ExactMass", "XLogP", "HBondDonorCount", "HBondAcceptorCount",
    "RotatableBondCount", "TPSA",
  ].join(",");

  const propRes = await fetch(`${base}/compound/cid/${cid}/property/${props}/JSON`);
  if (!propRes.ok) throw new Error(`PubChem property fetch failed (${propRes.status})`);
  const propData = await propRes.json();
  const p = propData?.PropertyTable?.Properties?.[0];
  if (!p) throw new Error("No properties returned from PubChem");

  return {
    cid,
    smiles: p.CanonicalSMILES,
    iupacName: p.IUPACName ?? name,
    molecularFormula: p.MolecularFormula,
    molecularWeight: p.MolecularWeight,
    exactMass: p.ExactMass,
    xlogp: p.XLogP ?? null,
    hbondDonor: p.HBondDonorCount,
    hbondAcceptor: p.HBondAcceptorCount,
    rotatableBonds: p.RotatableBondCount,
    tpsa: p.TPSA,
  };
}
