import { useState, useRef, useCallback } from "react";
import { Upload, Layers, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { corsFetch } from "@/lib/cors-proxy";
import { Input } from "@/components/ui/input";

interface Props {
  secondName: string;
  alignmentResult: { rmsd: number; alignedAtoms: number } | null;
  overlayVisible: boolean;
  loadSecondStructure: (data: string, name: string) => void;
  removeSecondStructure: () => void;
  toggleOverlay: () => void;
}

export default function MultiStructurePanel({
  secondName, alignmentResult, overlayVisible,
  loadSecondStructure, removeSecondStructure, toggleOverlay,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pdbId2, setPdbId2] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      loadSecondStructure(text, file.name);
      toast.success("Second structure loaded: " + file.name);
    };
    reader.readAsText(file);
  }, [loadSecondStructure]);

  const handleLoadRCSB = useCallback(async () => {
    if (!pdbId2.trim()) return;
    setLoading(true);
    try {
      const res = await corsFetch("https://files.rcsb.org/download/" + pdbId2.trim().toUpperCase() + ".pdb");
      if (!res.ok) throw new Error("Not found");
      const text = await res.text();
      loadSecondStructure(text, pdbId2.trim().toUpperCase());
      toast.success("Loaded " + pdbId2.trim().toUpperCase() + " for alignment");
    } catch (e: any) {
      toast.error(e.message || "Failed to load structure");
    } finally {
      setLoading(false);
    }
  }, [pdbId2, loadSecondStructure]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Upload or load a second structure to overlay and align.</p>

      {!secondName ? (
        <>
          <div className="flex gap-2">
            <Input
              placeholder="PDB ID (e.g. 1CRN)"
              value={pdbId2}
              onChange={(e) => setPdbId2(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleLoadRCSB(); }}
              className="flex-1"
            />
            <Button size="sm" onClick={handleLoadRCSB} disabled={loading || !pdbId2.trim()}>
              {loading ? "…" : "Load"}
            </Button>
          </div>
          <input ref={fileRef} type="file" className="hidden" accept=".pdb,.cif" onChange={handleFile} />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Upload PDB File
          </Button>
        </>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-secondary rounded-md">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">{secondName}</span>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={toggleOverlay} title={overlayVisible ? "Hide" : "Show"}>
                {overlayVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={removeSecondStructure} title="Remove">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {alignmentResult && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-secondary rounded-md p-2">
                <div className="text-[9px] text-muted-foreground uppercase">Pairwise RMSD</div>
                <div className={`text-sm font-bold font-mono ${
                  alignmentResult.rmsd < 2 ? "text-primary" : alignmentResult.rmsd < 5 ? "text-yellow-400" : "text-destructive"
                }`}>
                  {alignmentResult.rmsd.toFixed(3)} Å
                </div>
              </div>
              <div className="bg-secondary rounded-md p-2">
                <div className="text-[9px] text-muted-foreground uppercase">Aligned Atoms</div>
                <div className="text-sm font-bold font-mono text-foreground">{alignmentResult.alignedAtoms}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
