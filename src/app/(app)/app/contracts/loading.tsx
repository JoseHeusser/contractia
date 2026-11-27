export default function Loading() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 bg-lavender-deep rounded" />
        <div className="h-9 w-36 bg-lavender-deep rounded-lg" />
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-line p-5 flex items-center gap-4">
            <div className="h-10 w-10 bg-lavender rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-48 bg-lavender-deep rounded mb-2" />
              <div className="h-3 w-32 bg-lavender rounded" />
            </div>
            <div className="h-5 w-16 bg-lavender rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
