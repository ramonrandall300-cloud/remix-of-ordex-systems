import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";

interface CreditConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cost: number;
  balance: number;
  jobLabel: string;
  estimatedTime?: string;
  onConfirm: () => void;
}

export function CreditConfirmDialog({
  open,
  onOpenChange,
  cost,
  balance,
  jobLabel,
  estimatedTime,
  onConfirm,
}: CreditConfirmDialogProps) {
  const { user } = useAuth();
  // Default is manual approval — auto-approve only if explicitly enabled
  const autoApprove = user?.user_metadata?.auto_approve_credits === true;

  // If auto-approve is on, trigger onConfirm immediately when opened
  if (autoApprove && open) {
    // Use microtask to avoid setState-during-render
    queueMicrotask(() => {
      onOpenChange(false);
      onConfirm();
    });
    return null;
  }

  const remaining = balance - cost;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Confirm Job Submission</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">
                You are about to submit: <strong className="text-foreground">{jobLabel}</strong>
              </p>

              <div className="bg-muted rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="font-semibold text-primary">−{cost} credits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span className="font-semibold text-foreground">{balance} credits</span>
                </div>
                <div className="border-t border-border my-1" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">After Submission</span>
                  <span className={`font-semibold ${remaining >= 0 ? "text-foreground" : "text-destructive"}`}>
                    {remaining >= 0 ? `${remaining} credits` : "Insufficient"}
                  </span>
                </div>
                {estimatedTime && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Time</span>
                    <span className="text-muted-foreground">{estimatedTime}</span>
                  </div>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <p className="text-[11px] text-muted-foreground text-center">
            You can enable "Auto-approve credit usage" in Settings to skip this confirmation in the future.
          </p>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} disabled={remaining < 0}>
              Confirm &amp; Submit
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
