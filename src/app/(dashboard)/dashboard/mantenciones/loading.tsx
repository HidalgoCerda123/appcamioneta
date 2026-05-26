export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 rounded-lg w-40" />
        <div className="h-9 bg-gray-200 rounded-lg w-40" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-16" />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-14 border-b border-gray-50 px-5 py-3 flex gap-4">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
