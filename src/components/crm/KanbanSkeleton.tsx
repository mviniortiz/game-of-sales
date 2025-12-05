import { Skeleton } from "@/components/ui/skeleton";

export const KanbanSkeleton = () => {
  return (
    <div className="flex gap-5 p-6 h-full min-w-max animate-pulse">
      {/* Generate 5 skeleton columns */}
      {[...Array(5)].map((_, i) => (
        <div 
          key={i}
          className="flex flex-col w-[300px] flex-shrink-0 h-full rounded-xl overflow-hidden"
        >
          {/* Column Header Skeleton */}
          <div className="bg-card border-b border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1.5" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>
          </div>

          {/* Column Body Skeleton */}
          <div className="flex-1 bg-muted/60 p-3 space-y-3">
            {/* Random number of card skeletons per column */}
            {[...Array(Math.floor(Math.random() * 3) + 1)].map((_, j) => (
              <div 
                key={j}
                className="bg-card rounded-xl p-4 border border-border shadow-sm"
              >
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-3" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

