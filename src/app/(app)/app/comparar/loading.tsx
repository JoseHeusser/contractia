export default function Loading() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-pulse">
      <div className="h-7 w-40 bg-lavender-deep rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-line p-5">
            <div className="h-4 w-20 bg-lavender rounded mb-2" />
            <div className="h-8 w-12 bg-lavender-deep rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-line overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex border-b border-line p-4 gap-4">
            <div className="h-4 w-32 bg-lavender-deep rounded" />
            <div className="h-4 w-24 bg-lavender rounded" />
            <div className="h-4 w-24 bg-lavender rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
