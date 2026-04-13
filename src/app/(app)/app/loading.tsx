export default function Loading() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-32 bg-gray-100 rounded mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="h-9 w-9 bg-gray-100 rounded-lg mb-3" />
            <div className="h-7 w-16 bg-gray-200 rounded mb-1" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-14 bg-gray-50 rounded-lg mb-2" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
