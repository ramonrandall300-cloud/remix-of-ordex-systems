import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ToolPageErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ToolPageError({
  title = "Something went wrong",
  message = "We couldn't load the data for this tool. Please try again.",
  onRetry,
}: ToolPageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center animate-in fade-in duration-300">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}
