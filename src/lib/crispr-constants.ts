export const CRISPR_CREDIT_COST = 30;

export const CAS_VARIANTS = [
  "Cas9",
  "Cas12a",
  "Cas12b",
  "Cas13",
  "Cas14",
  "CasΦ (Cas12j)",
  "dCas9",
  "nCas9",
  "SaCas9",
  "SpCas9-HF",
] as const;

export const PAM_OPTIONS: Record<string, string[]> = {
  Cas9: ["NGG", "NAG", "NGA"],
  Cas12a: ["TTTV", "TTTN"],
  Cas12b: ["TTN", "ATTN"],
  Cas13: ["None (RNA-targeting)"],
  Cas14: ["None (ssDNA)"],
  "CasΦ (Cas12j)": ["TBN"],
  dCas9: ["NGG", "NAG", "NGA"],
  nCas9: ["NGG", "NAG", "NGA"],
  SaCas9: ["NNGRRT", "NNGRR"],
  "SpCas9-HF": ["NGG"],
};

export const ORGANISMS = [
  "Homo sapiens",
  "Mus musculus",
  "Caenorhabditis elegans",
  "Saccharomyces cerevisiae",
  "Drosophila melanogaster",
  "Danio rerio",
  "Arabidopsis thaliana",
  "Custom",
] as const;

export const STATUS_FLOW = ["active", "paused", "completed", "archived"] as const;

export const STATUS_COLORS: Record<string, string> = {
  active: "hsl(var(--primary))",
  paused: "hsl(var(--warning))",
  completed: "hsl(142 70% 45%)",
  archived: "hsl(var(--muted-foreground))",
};

export const LOG_TYPES = ["note", "transfection", "sequencing", "analysis", "observation", "protocol"] as const;
