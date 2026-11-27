export default function Loading() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-pulse">
      <div className="h-7 w-32 bg-lavender-deep rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-line p-5">
            <div className="h-4 w-24 bg-lavender-deep rounded mb-3" />
            <div className="h-3 w-full bg-lavender rounded mb-2" />
            <div className="h-3 w-3/4 bg-lavender rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
