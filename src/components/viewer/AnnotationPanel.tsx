import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Trash2, Plus, Share2 } from "lucide-react";
import { toast } from "sonner";

interface Annotation {
  id: string;
  pdb_id: string;
  residue_name: string | null;
  residue_number: number | null;
  chain: string | null;
  note: string;
  color: string;
  position_x?: number | null;
  position_y?: number | null;
  position_z?: number | null;
}

interface Props {
  pdbId: string;
  annotations: Annotation[];
  loading: boolean;
  selectedResidue: { resName: string; resNum: number; chain: string } | null;
  addAnnotation: (
    residueName: string | null, residueNumber: number | null, chain: string | null,
    note: string, position?: { x: number; y: number; z: number }, color?: string,
  ) => Promise<void>;
  updateAnnotation: (id: string, note: string) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
  viewerRef: React.MutableRefObject<any>;
}

const COLORS = ["#2dd4bf", "#f87171", "#60a5fa", "#fbbf24", "#a78bfa", "#fb923c"];

export default function AnnotationPanel({
  pdbId, annotations, loading, selectedResidue,
  addAnnotation, updateAnnotation, deleteAnnotation, viewerRef,
}: Props) {
  const [newNote, setNewNote] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const handleAdd = async () => {
    if (!newNote.trim()) return;

    let position: { x: number; y: number; z: number } | undefined;
    const v = viewerRef.current;

    // Get position of selected residue if available
    if (v && selectedResidue) {
      try {
        const atoms = v.getModel(0)?.selectedAtoms({
          resi: selectedResidue.resNum,
          chain: selectedResidue.chain,
        }) ?? [];
        if (atoms.length > 0) {
          const ca = atoms.find((a: any) => a.atom === "CA") ?? atoms[0];
          position = { x: ca.x, y: ca.y, z: ca.z };
        }
      } catch {}
    }

    await addAnnotation(
      selectedResidue?.resName ?? null,
      selectedResidue?.resNum ?? null,
      selectedResidue?.chain ?? null,
      newNote,
      position,
      selectedColor,
    );
    setNewNote("");
  };

  const handleShare = () => {
    const shareData = annotations.map((a) => ({
      residue: a.residue_name && a.residue_number ? `${a.residue_name}${a.residue_number}` : "General",
      chain: a.chain,
      note: a.note,
    }));
    navigator.clipboard.writeText(JSON.stringify({ pdb_id: pdbId, annotations: shareData }, null, 2));
    toast.success("Annotations copied to clipboard");
  };

  // Show annotation pins in viewer
  const focusAnnotation = (ann: Annotation) => {
    const v = viewerRef.current;
    if (!v || !ann.residue_number) return;
    try {
      v.zoomTo({ resi: ann.residue_number, chain: ann.chain ?? undefined }, 500);
      v.addLabel(ann.note.slice(0, 40), {
        position: { x: ann.position_x ?? 0, y: ann.position_y ?? 0, z: ann.position_z ?? 0 },
        fontSize: 10, fontColor: "white",
        backgroundColor: ann.color,
        borderThickness: 0,
      });
      v.render();
    } catch {}
  };

  if (!pdbId) {
    return <p className="text-xs text-muted-foreground py-2">Load a structure to add annotations</p>;
  }

  return (
    <div className="space-y-3">
      {/* Add annotation form */}
      <div className="space-y-2">
        {selectedResidue && (
          <div className="flex items-center gap-1.5 text-xs">
            <MapPin className="h-3 w-3 text-primary" />
            <span className="font-mono font-medium text-primary">
              {selectedResidue.resName}{selectedResidue.resNum}
            </span>
            <span className="text-muted-foreground">({selectedResidue.chain})</span>
          </div>
        )}
        <Textarea
          placeholder="Add a note about this residue or region…"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={2}
          className="text-xs"
        />
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-4 h-4 rounded-full border-2 transition-transform ${selectedColor === c ? "border-foreground scale-125" : "border-transparent"}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <Button size="sm" className="ml-auto" onClick={handleAdd} disabled={!newNote.trim()}>
            <Plus className="mr-1 h-3 w-3" /> Pin
          </Button>
        </div>
      </div>

      {/* Annotations list */}
      {annotations.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              Annotations ({annotations.length})
            </p>
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleShare} title="Copy to clipboard">
              <Share2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                className="flex items-start gap-2 bg-secondary rounded-md p-2 cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => focusAnnotation(ann)}
              >
                <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: ann.color }} />
                <div className="flex-1 min-w-0">
                  {ann.residue_name && ann.residue_number && (
                    <span className="text-[9px] font-mono text-primary">
                      {ann.residue_name}{ann.residue_number}{ann.chain ? ` (${ann.chain})` : ""}
                    </span>
                  )}
                  {editingId === ann.id ? (
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => { updateAnnotation(ann.id, editText); setEditingId(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { updateAnnotation(ann.id, editText); setEditingId(null); } }}
                      className="text-xs h-6 mt-0.5"
                      autoFocus
                    />
                  ) : (
                    <p
                      className="text-[11px] text-foreground break-words"
                      onDoubleClick={() => { setEditingId(ann.id); setEditText(ann.note); }}
                    >
                      {ann.note}
                    </p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 shrink-0 text-destructive/60 hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && annotations.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2 italic">
          No annotations yet. Select a residue and pin a note.
        </p>
      )}
    </div>
  );
}
