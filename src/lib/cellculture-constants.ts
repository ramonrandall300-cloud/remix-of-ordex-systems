export const CELL_LINES = [
  "HEK293", "HeLa", "CHO", "Jurkat", "MCF-7",
  "A549", "SH-SY5Y", "U2OS", "NIH/3T3", "Custom",
] as const;

export const MEDIA = [
  "DMEM + 10% FBS", "RPMI 1640 + 10% FBS", "MEM + 10% FBS",
  "F-12K + 10% FBS", "Neurobasal + B27", "Custom",
] as const;

export const CULTURE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "contaminated", label: "Contaminated" },
  { value: "archived", label: "Archived" },
  { value: "terminated", label: "Terminated" },
] as const;

export const CELLCULTURE_CREDIT_COST = 3;

export function statusVariant(s: string) {
  if (s === "active") return "default" as const;
  if (s === "contaminated") return "destructive" as const;
  return "secondary" as const;
}

export interface CultureFormValues {
  name: string;
  cell_line: string;
  passage_number: string;
  seeding_density: string;
  medium: string;
  temperature: string;
  co2_percent: string;
  humidity: string;
  notes: string;
  status?: string;
}

export const DEFAULT_CULTURE_FORM: CultureFormValues = {
  name: "",
  cell_line: "HEK293",
  passage_number: "1",
  seeding_density: "1e5 cells/mL",
  medium: "DMEM + 10% FBS",
  temperature: "37",
  co2_percent: "5",
  humidity: "95",
  notes: "",
};

export interface ObservationFormValues {
  confluence_percent: string;
  viability_percent: string;
  cell_count: string;
  morphology_notes: string;
  ph: string;
  glucose_level: string;
  lactate_level: string;
}

export const DEFAULT_OBSERVATION_FORM: ObservationFormValues = {
  confluence_percent: "",
  viability_percent: "",
  cell_count: "",
  morphology_notes: "",
  ph: "",
  glucose_level: "",
  lactate_level: "",
};
