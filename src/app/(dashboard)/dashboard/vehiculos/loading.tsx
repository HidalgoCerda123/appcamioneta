export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 rounded-lg w-32" />
        <div className="h-9 bg-gray-200 rounded-lg w-36" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-20" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm h-40" />
        ))}
      </div>
    </div>
  );
}
