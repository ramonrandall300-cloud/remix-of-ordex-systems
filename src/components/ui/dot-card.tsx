import { useState, useEffect, type ReactNode, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";

interface DotCardProps {
  children: ReactNode;
  className?: string;
  target?: number;
  duration?: number;
  showCounter?: boolean;
  counterLabel?: string;
}

export function DotCard({
  children,
  className,
  target = 777000,
  duration = 2000,
  showCounter = false,
  counterLabel = "Views",
}: DotCardProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!showCounter) return;
    let start = 0;
    const end = target;
    if (end <= 0) return;
    const increment = Math.ceil(end / (duration / 50));
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setCount(start);
    }, 50);
    return () => clearInterval(timer);
  }, [target, duration, showCounter]);

  const display = count < 1000 ? count : `${Math.floor(count / 1000)}k`;

  return (
    <div className="dot-card-outer group relative">
      <div className="dot-card-dot" />
      <div
        className={cn(
          "dot-card-inner relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground p-6",
          className
        )}
      >
        <div className="dot-card-ray" />
        {showCounter && (
          <div className="mb-4">
            <div className="text-3xl font-bold text-foreground">{display}</div>
            <div className="text-xs text-muted-foreground">{counterLabel}</div>
          </div>
        )}
        <div className="relative z-10">{children}</div>
        <div className="dot-card-line dot-card-line-top" />
        <div className="dot-card-line dot-card-line-left" />
        <div className="dot-card-line dot-card-line-bottom" />
        <div className="dot-card-line dot-card-line-right" />
      </div>
    </div>
  );
}
