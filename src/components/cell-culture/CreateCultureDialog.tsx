import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { CultureFormFields } from "./CultureFormFields";
import { useCultureForm } from "@/hooks/useCultureForms";

interface Props {
  onSubmit: (values: ReturnType<typeof useCultureForm>["parsed"]) => void;
  isPending: boolean;
  triggerLabel: string;
}

export function CreateCultureDialog({ onSubmit, isPending, triggerLabel }: Props) {
  const { form, update, reset, open, setOpen } = useCultureForm();

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSubmit({
      name: form.name,
      cell_line: form.cell_line,
      passage_number: Number(form.passage_number) || 1,
      seeding_density: form.seeding_density,
      medium: form.medium,
      temperature: Number(form.temperature) || 37,
      co2_percent: Number(form.co2_percent) || 5,
      humidity: Number(form.humidity) || 95,
      notes: form.notes || undefined,
      status: form.status,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> {triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Cell Culture</DialogTitle></DialogHeader>
        <CultureFormFields form={form} onChange={update} />
        <Button onClick={handleSubmit} disabled={!form.name.trim() || isPending} className="w-full">
          {isPending ? "Creating..." : "Create Culture"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
