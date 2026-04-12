import { Skeleton } from "@/components/ui/skeleton";

interface ToolPageSkeletonProps {
  columns?: 1 | 2;
}

export function ToolPageSkeleton({ columns = 2 }: ToolPageSkeletonProps) {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      <div className={columns === 2 ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "space-y-6"}>
        {/* Left / Main panel */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>

        {/* Right panel */}
        {columns === 2 && (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        )}
      </div>

      {/* Job list skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
