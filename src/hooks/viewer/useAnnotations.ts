import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useAnnotations(userId: string | undefined, structureName: string) {
  const [noteContent, setNoteContent] = useState("");

  const saveNote = useCallback(async () => {
    if (!userId || !structureName) return;
    try {
      const result = await supabase.from("viewer_notes").upsert(
        { user_id: userId, pdb_id: structureName, content: noteContent },
        { onConflict: "user_id,pdb_id" }
      );
      if (result.error) throw result.error;
      toast.success("Note saved");
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [userId, structureName, noteContent]);

  return { noteContent, setNoteContent, saveNote };
}
