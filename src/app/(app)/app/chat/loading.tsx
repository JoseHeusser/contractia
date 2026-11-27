export default function Loading() {
  return (
    <div className="flex h-full animate-pulse">
      <div className="w-64 border-r border-line bg-white p-4 hidden md:block">
        <div className="h-9 bg-lavender rounded-lg mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-surface rounded-lg mb-2" />
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="border-b border-line bg-white px-6 py-4">
          <div className="h-5 w-40 bg-lavender-deep rounded" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className={`h-12 rounded-2xl ${i % 2 === 0 ? 'w-48 bg-lavender-deep' : 'w-64 bg-lavender'}`} />
            </div>
          ))}
        </div>
        <div className="border-t border-line bg-white px-4 py-3">
          <div className="h-10 bg-lavender rounded-xl" />
        </div>
      </div>
    </div>
  )
}
