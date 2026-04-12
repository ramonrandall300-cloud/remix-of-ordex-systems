import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Droplets, Microscope } from "lucide-react";
import { statusVariant } from "@/lib/cellculture-constants";

interface Culture {
  id: string;
  name: string;
  cell_line: string;
  passage_number: number;
  temperature: number;
  co2_percent: number;
  status: string;
}

interface Props {
  cultures: Culture[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  label: string;
}

export function CultureList({ cultures, selectedId, onSelect, label }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{label}</h2>

      {cultures.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No cultures yet. Create one to get started.
          </CardContent>
        </Card>
      )}

      {cultures.map((c) => (
        <Card
          key={c.id}
          className={`cursor-pointer transition-all hover:border-primary/50 ${
            selectedId === c.id ? "border-primary ring-1 ring-primary/20" : ""
          }`}
          onClick={() => onSelect(c.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm truncate">{c.name}</span>
              <Badge variant={statusVariant(c.status)} className="text-xs">{c.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>{c.cell_line} · P{c.passage_number}</div>
              <div className="flex items-center gap-2">
                <Thermometer className="w-3 h-3" />{c.temperature}°C
                <Droplets className="w-3 h-3 ml-1" />CO₂ {c.co2_percent}%
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CultureEmptyState() {
  return (
    <Card className="border-dashed flex items-center justify-center min-h-[400px]">
      <CardContent className="text-center text-muted-foreground">
        <Microscope className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Select a culture</p>
        <p className="text-sm">Choose a culture from the list or create a new one</p>
      </CardContent>
    </Card>
  );
}
