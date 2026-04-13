export default function Loading() {
  return (
    <div className="flex h-full animate-pulse">
      <div className="w-64 border-r border-gray-100 bg-white p-4 hidden md:block">
        <div className="h-9 bg-gray-100 rounded-lg mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-50 rounded-lg mb-2" />
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-100 bg-white px-6 py-4">
          <div className="h-5 w-40 bg-gray-200 rounded" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className={`h-12 rounded-2xl ${i % 2 === 0 ? 'w-48 bg-blue-100' : 'w-64 bg-gray-100'}`} />
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 bg-white px-4 py-3">
          <div className="h-10 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
