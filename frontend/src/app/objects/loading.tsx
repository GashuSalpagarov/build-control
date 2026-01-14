import { Skeleton } from '@/components/ui/skeleton';

export default function ObjectsLoading() {
  return (
    <div className="flex-1 bg-background">
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Table skeleton */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[50px_1fr_100px_150px_150px] gap-4 px-6 py-3 bg-gray-50 border-b">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>

          {/* Table rows */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="grid grid-cols-[50px_1fr_100px_150px_150px] gap-4 px-6 py-4 border-b last:border-b-0"
            >
              <Skeleton className="h-6 w-6" />
              <div>
                <Skeleton className="h-5 w-64 mb-2" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-5 w-28 ml-auto" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
