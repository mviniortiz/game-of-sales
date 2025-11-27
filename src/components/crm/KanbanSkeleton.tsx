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
          <div className="bg-slate-900 border-b border-slate-800/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 rounded-xl bg-slate-800" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1.5 bg-slate-800" />
                  <Skeleton className="h-3 w-16 bg-slate-800/60" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-12 bg-slate-800/60" />
              <Skeleton className="h-6 w-20 rounded-lg bg-slate-800" />
            </div>
          </div>

          {/* Column Body Skeleton */}
          <div className="flex-1 bg-slate-900/30 p-3 space-y-3">
            {/* Random number of card skeletons per column */}
            {[...Array(Math.floor(Math.random() * 3) + 1)].map((_, j) => (
              <div 
                key={j}
                className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/20"
              >
                <Skeleton className="h-4 w-3/4 mb-2 bg-slate-700/50" />
                <Skeleton className="h-3 w-1/2 mb-3 bg-slate-700/30" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20 bg-slate-700/50" />
                  <Skeleton className="h-6 w-6 rounded-full bg-slate-700/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

