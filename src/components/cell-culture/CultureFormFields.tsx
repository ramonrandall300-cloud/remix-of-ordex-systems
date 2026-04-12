import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CELL_LINES, MEDIA, CULTURE_STATUSES, CultureFormValues } from "@/lib/cellculture-constants";

interface Props {
  form: CultureFormValues;
  onChange: <K extends keyof CultureFormValues>(key: K, value: CultureFormValues[K]) => void;
  showStatus?: boolean;
}

export function CultureFormFields({ form, onChange, showStatus }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Name</label>
        <Input value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="e.g. HEK293 Flask A" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Cell Line</label>
          <Select value={form.cell_line} onValueChange={(v) => onChange("cell_line", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CELL_LINES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Medium</label>
          <Select value={form.medium} onValueChange={(v) => onChange("medium", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MEDIA.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Passage #</label>
          <Input type="number" min={1} value={form.passage_number} onChange={(e) => onChange("passage_number", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Temp (°C)</label>
          <Input type="number" step={0.5} value={form.temperature} onChange={(e) => onChange("temperature", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">CO₂ (%)</label>
          <Input type="number" step={0.5} value={form.co2_percent} onChange={(e) => onChange("co2_percent", e.target.value)} />
        </div>
      </div>
      {showStatus ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Seeding Density</label>
            <Input value={form.seeding_density} onChange={(e) => onChange("seeding_density", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={form.status || "active"} onValueChange={(v) => onChange("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CULTURE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Seeding Density</label>
          <Input value={form.seeding_density} onChange={(e) => onChange("seeding_density", e.target.value)} />
        </div>
      )}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Notes</label>
        <Textarea value={form.notes} onChange={(e) => onChange("notes", e.target.value)} rows={2} />
      </div>
    </div>
  );
}
