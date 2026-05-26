export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 rounded-lg w-36" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 border-b border-gray-50 px-5 py-3 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-40" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
