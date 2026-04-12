import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Annotation {
  id: string;
  pdb_id: string;
  residue_name: string | null;
  residue_number: number | null;
  chain: string | null;
  note: string;
  position_x: number | null;
  position_y: number | null;
  position_z: number | null;
  color: string;
}

export function useResidueAnnotations(userId: string | undefined, pdbId: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch annotations when pdbId changes
  useEffect(() => {
    if (!userId || !pdbId) {
      setAnnotations([]);
      return;
    }
    setLoading(true);
    supabase
      .from("structure_annotations")
      .select("*")
      .eq("user_id", userId)
      .eq("pdb_id", pdbId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.warn("Failed to load annotations:", error);
        } else {
          setAnnotations((data as Annotation[]) ?? []);
        }
        setLoading(false);
      });
  }, [userId, pdbId]);

  const addAnnotation = useCallback(async (
    residueName: string | null,
    residueNumber: number | null,
    chain: string | null,
    note: string,
    position?: { x: number; y: number; z: number },
    color?: string,
  ) => {
    if (!userId || !pdbId) return;
    try {
      const { data, error } = await supabase
        .from("structure_annotations")
        .insert({
          user_id: userId,
          pdb_id: pdbId,
          residue_name: residueName,
          residue_number: residueNumber,
          chain,
          note,
          position_x: position?.x ?? null,
          position_y: position?.y ?? null,
          position_z: position?.z ?? null,
          color: color ?? "#2dd4bf",
        })
        .select()
        .single();

      if (error) throw error;
      setAnnotations((prev) => [...prev, data as Annotation]);
      toast.success("Annotation added");
    } catch (e: any) {
      toast.error(e.message || "Failed to add annotation");
    }
  }, [userId, pdbId]);

  const updateAnnotation = useCallback(async (id: string, note: string) => {
    try {
      const { error } = await supabase
        .from("structure_annotations")
        .update({ note })
        .eq("id", id);
      if (error) throw error;
      setAnnotations((prev) => prev.map((a) => a.id === id ? { ...a, note } : a));
      toast.success("Annotation updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update annotation");
    }
  }, []);

  const deleteAnnotation = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("structure_annotations")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      toast.success("Annotation removed");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete annotation");
    }
  }, []);

  return { annotations, loading, addAnnotation, updateAnnotation, deleteAnnotation };
}
