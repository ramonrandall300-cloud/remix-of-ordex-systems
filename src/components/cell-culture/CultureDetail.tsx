import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { statusVariant } from "@/lib/cellculture-constants";

interface Culture {
  id: string;
  name: string;
  cell_line: string;
  medium: string;
  passage_number: number;
  temperature: number;
  co2_percent: number;
  humidity: number;
  status: string;
  notes: string | null;
}

interface Props {
  culture: Culture;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function CultureDetail({ culture, onEdit, onDelete, isDeleting }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{culture.name}</CardTitle>
            <CardDescription>
              {culture.cell_line} · {culture.medium} · Passage {culture.passage_number}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete culture?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &quot;{culture.name}&quot; and all associated logs and analyses. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Badge variant={statusVariant(culture.status)}>{culture.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Temperature</div>
            <div className="font-bold">{culture.temperature}°C</div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs text-muted-foreground">CO₂</div>
            <div className="font-bold">{culture.co2_percent}%</div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Humidity</div>
            <div className="font-bold">{culture.humidity}%</div>
          </div>
        </div>
        {culture.notes && <p className="text-muted-foreground text-xs mt-2">{culture.notes}</p>}
      </CardContent>
    </Card>
  );
}
