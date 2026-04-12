import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CultureFormFields } from "./CultureFormFields";
import { CultureFormValues } from "@/lib/cellculture-constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CultureFormValues;
  onChange: <K extends keyof CultureFormValues>(key: K, value: CultureFormValues[K]) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function EditCultureDialog({ open, onOpenChange, form, onChange, onSubmit, isPending }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Cell Culture</DialogTitle></DialogHeader>
        <CultureFormFields form={form} onChange={onChange} showStatus />
        <Button onClick={onSubmit} disabled={!form.name.trim() || isPending} className="w-full">
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
