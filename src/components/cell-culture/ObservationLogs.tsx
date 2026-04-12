import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { ObservationFormValues } from "@/lib/cellculture-constants";

interface Log {
  id: string;
  logged_at: string;
  confluence_percent: number | null;
  viability_percent: number | null;
  cell_count: number | null;
  ph: number | null;
  glucose_level: number | null;
  lactate_level: number | null;
  morphology_notes: string | null;
}

interface Props {
  logs: Log[];
  form: ObservationFormValues;
  onChange: <K extends keyof ObservationFormValues>(key: K, value: ObservationFormValues[K]) => void;
  onSubmit: () => void;
  isPending: boolean;
  dialogOpen: boolean;
  onDialogChange: (open: boolean) => void;
}

export function ObservationLogs({ logs, form, onChange, onSubmit, isPending, dialogOpen, onDialogChange }: Props) {
  return (
    <div className="space-y-3 mt-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">{logs.length} Observation{logs.length !== 1 ? "s" : ""}</h3>
        <Dialog open={dialogOpen} onOpenChange={onDialogChange}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1"><Plus className="w-3 h-3" /> Log Observation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Observation</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Confluence (%)</label>
                  <Input type="number" min={0} max={100} value={form.confluence_percent} onChange={(e) => onChange("confluence_percent", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Viability (%)</label>
                  <Input type="number" min={0} max={100} value={form.viability_percent} onChange={(e) => onChange("viability_percent", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Cell Count</label>
                  <Input type="number" value={form.cell_count} onChange={(e) => onChange("cell_count", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">pH</label>
                  <Input type="number" step={0.1} value={form.ph} onChange={(e) => onChange("ph", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Glucose (mM)</label>
                  <Input type="number" step={0.1} value={form.glucose_level} onChange={(e) => onChange("glucose_level", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Lactate (mM)</label>
                <Input type="number" step={0.1} value={form.lactate_level} onChange={(e) => onChange("lactate_level", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Morphology Notes</label>
                <Textarea value={form.morphology_notes} onChange={(e) => onChange("morphology_notes", e.target.value)} rows={2} />
              </div>
              <Button onClick={onSubmit} disabled={isPending} className="w-full">
                {isPending ? "Saving..." : "Save Observation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {logs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No observations yet. Log your first one.</p>
      )}

      {logs.map((log) => (
        <Card key={log.id}>
          <CardContent className="p-3 text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><span className="text-muted-foreground">Time:</span> {new Date(log.logged_at).toLocaleString()}</div>
            {log.confluence_percent != null && <div><span className="text-muted-foreground">Confluence:</span> {log.confluence_percent}%</div>}
            {log.viability_percent != null && <div><span className="text-muted-foreground">Viability:</span> {log.viability_percent}%</div>}
            {log.cell_count != null && <div><span className="text-muted-foreground">Count:</span> {Number(log.cell_count).toLocaleString()}</div>}
            {log.ph != null && <div><span className="text-muted-foreground">pH:</span> {log.ph}</div>}
            {log.glucose_level != null && <div><span className="text-muted-foreground">Glucose:</span> {log.glucose_level} mM</div>}
            {log.lactate_level != null && <div><span className="text-muted-foreground">Lactate:</span> {log.lactate_level} mM</div>}
            {log.morphology_notes && <div className="col-span-full"><span className="text-muted-foreground">Morphology:</span> {log.morphology_notes}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
