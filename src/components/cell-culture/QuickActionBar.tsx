import { Button } from "@/components/ui/button";
import {
  Plus, FlaskConical, AlertTriangle, Activity, FileText,
} from "lucide-react";

interface Props {
  onLogObservation: () => void;
  onPassage: () => void;
  onMarkContaminated: () => void;
  onRunAnalysis: () => void;
}

export function QuickActionBar({ onLogObservation, onPassage, onMarkContaminated, onRunAnalysis }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={onLogObservation}>
        <Plus className="w-3.5 h-3.5" /> Log Observation
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={onPassage}>
        <FlaskConical className="w-3.5 h-3.5" /> Passage Culture
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 text-destructive hover:text-destructive" onClick={onMarkContaminated}>
        <AlertTriangle className="w-3.5 h-3.5" /> Mark Contaminated
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={onRunAnalysis}>
        <Activity className="w-3.5 h-3.5" /> Run AI Analysis
      </Button>
    </div>
  );
}
