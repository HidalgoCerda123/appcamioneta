export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-lg w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-24" />
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-64" />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-48" />
    </div>
  );
}
