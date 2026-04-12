import { useState, useCallback } from "react";
import {
  CultureFormValues,
  DEFAULT_CULTURE_FORM,
  ObservationFormValues,
  DEFAULT_OBSERVATION_FORM,
} from "@/lib/cellculture-constants";

export function useCultureForm(initial?: Partial<CultureFormValues>) {
  const [form, setForm] = useState<CultureFormValues>({ ...DEFAULT_CULTURE_FORM, ...initial });
  const [open, setOpen] = useState(false);

  const update = useCallback(
    <K extends keyof CultureFormValues>(key: K, value: CultureFormValues[K]) =>
      setForm((p) => ({ ...p, [key]: value })),
    [],
  );

  const reset = useCallback(() => {
    setForm({ ...DEFAULT_CULTURE_FORM, ...initial });
    setOpen(false);
  }, [initial]);

  const openWith = useCallback((values: Partial<CultureFormValues>) => {
    setForm({ ...DEFAULT_CULTURE_FORM, ...values });
    setOpen(true);
  }, []);

  const parsed = {
    name: form.name,
    cell_line: form.cell_line,
    passage_number: Number(form.passage_number) || 1,
    seeding_density: form.seeding_density,
    medium: form.medium,
    temperature: Number(form.temperature) || 37,
    co2_percent: Number(form.co2_percent) || 5,
    humidity: Number(form.humidity) || 95,
    notes: form.notes || undefined,
    status: form.status,
  };

  return { form, update, reset, open, setOpen, openWith, parsed };
}

export function useObservationForm() {
  const [form, setForm] = useState<ObservationFormValues>(DEFAULT_OBSERVATION_FORM);
  const [open, setOpen] = useState(false);

  const update = useCallback(
    <K extends keyof ObservationFormValues>(key: K, value: ObservationFormValues[K]) =>
      setForm((p) => ({ ...p, [key]: value })),
    [],
  );

  const reset = useCallback(() => {
    setForm(DEFAULT_OBSERVATION_FORM);
    setOpen(false);
  }, []);

  const parsed = () => {
    const result: Record<string, number | string> = {};
    if (form.confluence_percent) result.confluence_percent = Number(form.confluence_percent);
    if (form.viability_percent) result.viability_percent = Number(form.viability_percent);
    if (form.cell_count) result.cell_count = Number(form.cell_count);
    if (form.morphology_notes) result.morphology_notes = form.morphology_notes;
    if (form.ph) result.ph = Number(form.ph);
    if (form.glucose_level) result.glucose_level = Number(form.glucose_level);
    if (form.lactate_level) result.lactate_level = Number(form.lactate_level);
    return result;
  };

  return { form, update, reset, open, setOpen, parsed };
}
